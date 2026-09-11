resource "aws_lb" "front_end" {
  name = "front_lb"
  internal = false
  load_balancer_type = "application"
  security_groups = [aws_security_group.front_sg.id]
  subnets = [ aws_subnet.public.id , aws_subnet.public2.id]
}

resource "aws_lb_target_group" "target_group_front" {
  name     = "front_lb_tg"
  port     = 80
  protocol = "HTTP"
  target_type = "ip"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/"
    protocol            = "HTTP"
    port                = "80"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}
resource "aws_lb_target_group" "target_group_back" {
  name     = "back_lb_tg"
  port     = 3000
  protocol = "HTTP"
  target_type = "ip"
  vpc_id   = aws_vpc.main.id
  health_check {
    enabled             = true
    path                = "/"
    protocol            = "HTTP"
    port                = "3000"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "front_end_listener_lb" {
  load_balancer_arn = aws_lb.front_end.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.target_group_front.arn
  }
}