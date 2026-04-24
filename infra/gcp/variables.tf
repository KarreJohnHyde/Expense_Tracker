variable "project_id" {
  type        = string
  description = "Google Cloud project id"
}

variable "region" {
  type        = string
  description = "Deployment region"
  default     = "us-central1"
}

variable "worker_image" {
  type        = string
  description = "Container image for OCR worker"
}

variable "api_image" {
  type        = string
  description = "Container image for node API service"
}

variable "kms_key_name" {
  type        = string
  description = "Optional CMEK key name for GCS bucket"
  default     = null
}