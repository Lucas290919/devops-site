variable "instance_type" {
  type = string
  default  = "t3.micro"
}
variable "availability_zone" {
  type = string
  default = "us-east-1a"
}
variable "availability_zone_RDS1" {
  type = string
  default = "us-east-1b"
}
