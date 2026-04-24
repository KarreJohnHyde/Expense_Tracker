output "worker_url" {
  value = google_cloud_run_v2_service.worker.uri
}

output "api_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "receipt_bucket" {
  value = google_storage_bucket.receipts.name
}

output "ocr_topic" {
  value = google_pubsub_topic.ocr_jobs.name
}