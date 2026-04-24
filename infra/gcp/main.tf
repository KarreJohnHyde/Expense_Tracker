terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.50.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_storage_bucket" "receipts" {
  name                        = "${var.project_id}-expense-receipts"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = var.kms_key_name
  }
}

resource "google_pubsub_topic" "ocr_jobs" {
  name = "ocr-jobs"
}

resource "google_pubsub_subscription" "ocr_jobs_sub" {
  name  = "ocr-jobs-worker-sub"
  topic = google_pubsub_topic.ocr_jobs.name

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.worker.uri}/process-image-from-path"
    oidc_token {
      service_account_email = google_service_account.pubsub_invoker.email
    }
  }
}

resource "google_service_account" "runtime" {
  account_id   = "ocr-runtime"
  display_name = "OCR runtime"
}

resource "google_service_account" "pubsub_invoker" {
  account_id   = "ocr-pubsub-invoker"
  display_name = "PubSub push invoker"
}

resource "google_project_iam_member" "runtime_storage_access" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_cloud_run_v2_service" "worker" {
  name     = "expense-ocr-worker"
  location = var.region

  template {
    service_account = google_service_account.runtime.email

    containers {
      image = var.worker_image

      ports {
        container_port = 8080
      }

      env {
        name  = "MAX_FILE_BYTES"
        value = "12582912"
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }
}

resource "google_cloud_run_v2_service" "api" {
  name     = "expense-ocr-node-api"
  location = var.region

  template {
    service_account = google_service_account.runtime.email

    containers {
      image = var.api_image

      ports {
        container_port = 8080
      }

      env {
        name  = "OCR_WORKER_URL"
        value = google_cloud_run_v2_service.worker.uri
      }

      env {
        name  = "RECEIPT_UPLOAD_BUCKET"
        value = google_storage_bucket.receipts.name
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 15
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "worker_invoker" {
  service  = google_cloud_run_v2_service.worker.name
  location = google_cloud_run_v2_service.worker.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "api_invoker" {
  service  = google_cloud_run_v2_service.api.name
  location = google_cloud_run_v2_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
