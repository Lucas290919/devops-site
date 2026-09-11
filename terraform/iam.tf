resource "aws_iam_role" "ecs_execution_role" {
  name = "ecs_task_execution_role_front"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}
resource "aws_iam_role" "ecs_execution_role-back" {
  name = "ecs_task_execution_role_back"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecs_back_ssm_policy" {
  name = "ecs_back_ssm_secrets_policy"
  role = aws_iam_role.ecs_execution_role-back.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "kms:Decrypt"
        ]
        Resource = [
          aws_ssm_parameter.db_password.arn,
          aws_ssm_parameter.jwt_secret.arn
        ]
      }
    ]
  })
}
resource "aws_iam_role" "firehose_role" {
  name = "firehose_delivery_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "firehose_s3_policy" {
  name = "firehose_s3_policy"
  role = aws_iam_role.firehose_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.logs.arn,
          "${aws_s3_bucket.logs.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role" "cloudwatch_to_firehose_role" {
  name = "cloudwatch_to_firehose_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "logs.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "cloudwatch_to_firehose_policy" {
  name = "cloudwatch_to_firehose_policy"
  role = aws_iam_role.cloudwatch_to_firehose_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["firehose:PutRecord", "firehose:PutRecordBatch"]
        Resource = aws_kinesis_firehose_delivery_stream.log_stream.arn
      }
    ]
  })
}


data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "ec2_migration" {
  name               = "ec2_migration_role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy" "ec2_migration_policy" {
  name = "ec2_ssm_secrets_policy" 
  role = aws_iam_role.ec2_migration.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "kms:Decrypt"
        ]
        Resource = [
          aws_ssm_parameter.db_password.arn,
          aws_ssm_parameter.jwt_secret.arn
        ]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2_database_migration_profile" {
  name = "ec2_migration_profile"
  role = aws_iam_role.ec2_migration.name
}