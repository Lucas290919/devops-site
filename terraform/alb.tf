resource "aws_lb" "front_end" {
  name = "front_lb"
  internal = false
  load_balancer_type = "application"
  security_groups = [aws_security_group.front_sg.id]
  subnets = [ aws_subnet.public.id , aws_subnet.public2.id]
}

resource "aws_lb_target_group" "target_group_front" {
  name     = "front_lb_tg"
  port     = 443
  protocol = "HTTPS"
  target_type = "ip"
  vpc_id   = aws_vpc.main.id
}
resource "aws_lb_target_group" "target_group_back" {
  name     = "back_lb_tg"
  port     = 3000
  protocol = "HTTP"
  target_type = "ip"
  vpc_id   = aws_vpc.main.id
}

resource "aws_lb_listener" "front_end_listener_lb" {
  load_balancer_arn = aws_lb.front_end.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = "arn:aws:iam::187416307283:server-certificate/test_cert_rab3wuqwgja25ct3n4jdj2tzu4"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.target_group_front.arn
  }
}