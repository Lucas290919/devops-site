resource "aws_lb" "front_end" {
  name = "front_lb"
  internal = false
  load_balancer_type = "application"
  security_groups = [aws_ecs_service.front-end-service]
  subnets = [ aws_subnet.public.id ]
}

resource "aws_lb_target_group" "target_group_front" {
  name     = "front_lb_tg"
  port     = 80
  protocol = "HTTP"
  target_type = "ip"
  vpc_id   = aws_vpc.main.id
}

resource "aws_lb_listener" "front_end_listener_lb" {
  load_balancer_arn = aws_lb.front_end.arn
  port              = "80"
  protocol          = "HTTP"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = "arn:aws:iam::187416307283:server-certificate/test_cert_rab3wuqwgja25ct3n4jdj2tzu4"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.target_group_front.arn
  }
}