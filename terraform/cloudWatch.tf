resource "aws_cloudwatch_log_group" "logs_front" {
  name = "/ecs/front_end"
  retention_in_days = 7
  tags = {
    "cw:datasource:name" = "front_end"
    "cw:datasource:type" = "events"
  }
}
resource "aws_cloudwatch_log_group" "logs_back" {
  name = "/ecs/back_end"
  retention_in_days = 7
  tags = {
    "cw:datasource:name" = "back_end"
    "cw:datasource:type" = "events"
  }
}

resource "aws_kinesis_firehose_delivery_stream" "log_stream" {
  name        = "kinesis-firehose-logs-to-s3"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose_role.arn
    bucket_arn = aws_s3_bucket.logs.arn
    buffering_size     = 5
    buffering_interval = 300
  }
}

resource "aws_cloudwatch_log_subscription_filter" "s3_export" {
  name            = "export-to-firehose"
  log_group_name  = aws_cloudwatch_log_group.logs_s3.name 
  filter_pattern  = "" 
  destination_arn = aws_kinesis_firehose_delivery_stream.log_stream.arn
  role_arn        = aws_iam_role.cloudwatch_to_firehose_role.arn
}