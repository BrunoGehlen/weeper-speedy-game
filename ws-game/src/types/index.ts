export type Cell = string | null;

export interface MessageData {
    row: number;
    column: number;
    assignedColor: string;
}
export interface PingMessage {
    type: 'ping';
}