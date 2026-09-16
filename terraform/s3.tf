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
    // O Firehose não adiciona as tags usadas anteriormente. O prefixo vazio
    // faz a retenção valer para todos os objetos de log deste bucket.
    filter {
      prefix = ""
    }
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    transition {
      days          = 60
      storage_class = "GLACIER"
    }
  }
}

// O bucket recebe somente logs internos; nunca deve ser público.
resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id

  versioning_configuration {
    status = "Enabled"
  }
}