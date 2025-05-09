import React, { useState, useEffect, useRef } from 'react';
import type { Cell, MessageData, PingMessage } from "../../types/index";
import { v4 as uuidv4 } from 'uuid';


type PlayerProps = {
    assignedColor: string | null;
    gameTime: string | null;
    getScore: (color: string) => number;
}

const Players: React.FC<PlayerProps> = ({ assignedColor, gameTime, getScore }: PlayerProps) => {
    return (
        <div style={{
            display: "flex",
            justifyContent: 'center',
            width: "100%",
            marginTop: "12px",
        }}>
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                width: "44vw",
            }}>
                <div>
                    {
                        Array("blue", "red").map(color => {
                            return (
                                <>
                                    <span style={{
                                        color: color,
                                        textDecoration: color === assignedColor ? "underline" : "none",
                                        textDecorationColor: assignedColor ?? undefined
                                    }}>
                                        {`${color.charAt(0).toUpperCase() + color.slice(1)}: ${getScore(color)}`}
                                    </span>
                                    <br />
                                </>
                            )
                        })
                    }
                </div>
                <div>
                    {`${gameTime}`}
                </div>
            </div>

        </div>

    );
}

type BoardProps = {
    board: Cell[][] | null;
    assignedColor: string | null;
    handleClick: (row: number, column: number) => void;
}

const Board: React.FC<BoardProps> = ({ board, assignedColor, handleClick }: BoardProps) => {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 11vw)',
            gridGap: '0px',
            justifyContent: 'center',
        }}>
            {board?.map((rowArr, r) =>
                rowArr.map((cell, c) => (
                    <div
                        key={`${r}-${c}`}
                        onClick={() => handleClick(r, c)}
                        style={{
                            width: '11vw',
                            height: '11vw',
                            backgroundColor: cell || 'white',
                            border: '1px solid black',
                            cursor: assignedColor ? 'pointer' : 'default',
                        }}
                    />
                ))
            )}
        </div>
    )
}

const Grid: React.FC = () => {
    const [assignedColor, setAssignedColor] = useState<string | null>(null);
    const [board, setBoard] = useState<Cell[][] | null>(null);
    const [gameTime, setGameTime] = useState<string | null>("0:00");
    const [gameOver, setGameOver] = useState(false);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        const id = uuidv4();

        console.log("creating WebSocket…");
        const socket = new WebSocket("wss://ws-server-app--0000011.wittymeadow-43996ec3.eastus.azurecontainerapps.io");
        ws.current = socket;

        socket.onopen = () => {
            console.log("WebSocket connected");
        };
        const handlers: Record<string, (data: any) => void> = {
            assignColor: ({ color }) => setAssignedColor(color),
            updateBoard: ({ board }) => setBoard(board),
            gameTimeUpdate: ({ gameTime }) => setGameTime(gameTime),
            gameOver: ({ reason, board }) => {
                setBoard(board);
                socket.close(1000, "User chose to disconnect");
                const playAgain = window.confirm(`${reason}\nDo you want to play again?`);
                if (playAgain) {
                    window.location.reload();
                } else {
                    setGameOver(true);
                }
            },
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const handler = handlers[data.type];
            if (handler) {
                handler(data);
            } else {
                console.warn("Unhandled message type:", data.type);
            }
        };
        socket.onerror = (err) => console.error("WebSocket error", err);
        const heartbeatId = window.setInterval(() => {
            if (ws.current?.readyState === WebSocket.OPEN) {
                const msg: PingMessage = { type: 'ping' };
                ws.current.send(JSON.stringify(msg));
                console.log('→ ping');
            }
        }, 1000);

        return () => {
            clearInterval(heartbeatId);
            console.log("closing WebSocket");
            ws.current?.close(1000, "Component unmount");
        };
    }, []);

    const handleClick = (row: number, column: number) => {
        if (!assignedColor) return;
        if (!board) return;
        if (board[row][column] !== null) return;
        const message: MessageData = { row, column, assignedColor: assignedColor };
        ws.current?.send(JSON.stringify(message));
    };

    const getScore = (color: string) => {
        if (!board) return 0;
        let score = 0;
        board.flatMap(row => row).forEach(cell => {
            if (cell === color) {
                score++;
            }
        })
        return score;
    }

    return (
        <div>
            <h2 style={{
            display: "flex",
            justifyContent: 'center',
            width: "100%",
            marginTop: "12px",
        }}>{gameOver ? "Game Over" : "Fun game!"}</h2>
            {!gameOver &&
                <Board board={board} assignedColor={assignedColor} handleClick={handleClick} />
            }
            <div>
                <Players assignedColor={assignedColor} gameTime={gameTime} getScore={getScore} />
            </div>
        </div>
    );
};

export default Grid;
