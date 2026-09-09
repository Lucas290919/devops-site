resource "aws_s3_bucket" "logs" {
  bucket = "cloud-watch-logs-projeto-devops"
  tags = {
    Name = "My bucket"
  }
}
resource "aws_s3_bucket_lifecycle_configuration" "logs_lifecycle" {
  bucket = aws_s3_bucket.logs.bucket

  rule {
    id = "log"
    expiration {
      days = 100
    }
    filter {
      and {
        prefix = "log/"
        tags = {
          rule      = "log"
          autoclean = "true"
        }
      }
    }
    status = "Enabled"

    transition {
      days = 30
      storage_class = "STANDARD_IA"
    }
    transition {
      days = 60
      storage_class = "GLACIER"
    }
  }
}