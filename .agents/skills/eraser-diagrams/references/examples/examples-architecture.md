# Architecture Diagram Example

## Simple Web App
A typical 3-tier web application architecture on AWS.

```eraser
// Global Styles
direction right
colorMode bold
styleMode plain
typeface clean

// Nodes
Client [icon: user]

Group: Cloud {
  LB [icon: aws-elastic-load-balancing]
  Server [icon: aws-ec2]
  DB [icon: aws-rds]
}

// Connections
Client > LB: HTTPS
LB > Server: HTTP
Server > DB: SQL
```
