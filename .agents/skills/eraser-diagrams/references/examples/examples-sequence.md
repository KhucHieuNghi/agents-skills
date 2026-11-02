# Sequence Diagram Example

## API Authentication Flow
Sequence of interactions for a secure API call.

```eraser
// Styles
autoNumber on
colorMode bold

// Participants
Client [icon: user]
API Gateway [icon: server]
Auth Service [icon: shield]
Resource Service [icon: database]

// Flow
Client > API Gateway: Request /resource
activate API Gateway

API Gateway > Auth Service: Validate Token
activate Auth Service
Auth Service > API Gateway: Token Valid
deactivate Auth Service

API Gateway > Resource Service: Fetch Data
activate Resource Service
Resource Service > API Gateway: Data
deactivate Resource Service

API Gateway > Client: 200 OK
deactivate API Gateway
```
