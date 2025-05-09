terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.80.0"
    }
  }
}

variable "subscription_id" {
  description = "Azure Subscription ID where resources will be created"
  type        = string
}

provider "azurerm" {
  subscription_id                 = var.subscription_id
  resource_provider_registrations = "none"
  features {}
}
˙
variable "container_image" {
  type    = string
  default = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
}

variable "location" {
  type    = string
  default = "East US"
}

variable "resource_group_name" {
  type    = string
  default = "wespertf"
}

variable "container_app_env_name" {
  type    = string
  default = "env-websocket"
}

variable "container_app_name" {
  type    = string
  default = "ws-server-app"
}

# variable "container_image" {
#   description = "Docker image for your WebSocket server"
#   type        = string
# }

########################
# RESOURCE GROUP
########################
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

########################
# CONTAINER REGISTRY (ACR)
########################
resource "azurerm_container_registry" "acr" {
  name                = "${var.resource_group_name}acr"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
  admin_enabled       = true
}

########################
# CONTAINER APPS ENVIRONMENT
########################
resource "azurerm_container_app_environment" "env" {
  name                = var.container_app_env_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

########################
# WEB SOCKET CONTAINER APP
########################
resource "azurerm_container_app" "ws" {
  name                         = var.container_app_name
  resource_group_name          = azurerm_resource_group.rg.name
  container_app_environment_id = azurerm_container_app_environment.env.id

  revision_mode = "Single"

  identity {
    type = "SystemAssigned"
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    # container {
    #   name   = "ws-server"
    #   image  = var.container_image
    #   cpu    = 0.5
    #   memory = "1.0Gi"
    # }
    container {
      name   = "ws-server"
      image  = var.container_image
      cpu    = 0.5
      memory = "1.0Gi"
    }

    min_replicas = 0
    max_replicas = 5

    http_scale_rule {
      name                = "http-scale"
      concurrent_requests = "1"
    }
  }
}

########################
# ASSIGN ACR PULL ROLE TO CONTAINER APP IDENTITY
########################
resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_container_app.ws.identity[0].principal_id
}

########################
# OUTPUTS
########################
output "container_app_fqdn" {
  description = "The FQDN of your WebSocket Container App"
  value       = azurerm_container_app.ws.ingress[0].fqdn
}

output "acr_login_server" {
  description = "Login server for the Azure Container Registry"
  value       = azurerm_container_registry.acr.login_server
}



#----

########################
# VARIABLES FOR FRONTEND
########################
variable "frontend_image" {
  description = "Docker image for your React front end (override via -var)"
  type        = string
  # using Nginx hello demo as a working placeholder
  default = "nginxdemos/hello:latest"
}

variable "frontend_app_name" {
  description = "Name for the React front end Container App"
  type        = string
  default     = "web-game-app"
}

########################
# REACT FRONTEND CONTAINER APP
########################
resource "azurerm_container_app" "frontend" {
  name                         = var.frontend_app_name
  resource_group_name          = azurerm_resource_group.rg.name
  container_app_environment_id = azurerm_container_app_environment.env.id

  revision_mode = "Single"

  identity {
    type = "SystemAssigned"
  }

  ingress {
    external_enabled = true
    target_port      = 80
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    container {
      name   = "frontend"
      image  = var.frontend_image
      cpu    = 0.5
      memory = "1.0Gi"
    }

    min_replicas = 0
    max_replicas = 5

    http_scale_rule {
      name                = "http-scale"
      concurrent_requests = 50
    }
  }
}

########################
# ACR PULL ROLE FOR FRONTEND IDENTITY
########################
resource "azurerm_role_assignment" "acr_pull_frontend" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_container_app.frontend.identity[0].principal_id
}

########################
# OUTPUTS FOR FRONTEND
########################
output "frontend_app_fqdn" {
  description = "The FQDN of your React Frontend Container App"
  value       = azurerm_container_app.frontend.ingress[0].fqdn
}
