# IaC AWS — Diagram-as-Code Examples

## Architecture

```
direction right
colorMode bold
styleMode plain
typeface clean

Client [icon: user]

AWS {
  Edge {
    EdgeCDN [icon: aws-cloudfront, label: "CloudFront"]
    StaticSite [icon: aws-s3, label: "Static Site"]
  }
  APIGroup {
    APIGW [icon: aws-api-gateway, label: "API Gateway"]
  }
  Compute {
    Lambda [icon: aws-lambda]
  }
  Data {
    DB [icon: aws-dynamodb, label: "DynamoDB"]
    Uploads [icon: aws-s3, label: "Uploads Bucket"]
  }
  Observability {
    Logs [icon: aws-cloudwatch, label: "CloudWatch"]
  }
}

Client > EdgeCDN: HTTPS [color: "#3399ff"]
EdgeCDN > StaticSite: CDN [color: "#3399ff"]
Client > APIGW: HTTPS [color: "#3399ff"]
APIGW > Lambda: Invoke [color: green]
Lambda <> DB: CRUD [color: green]
APIGW > Client: Presigned URL [color: green]
Client > Uploads: PUT (presigned) [color: "#3399ff"]
Uploads > Lambda: ObjectCreated Event [color: orange]
Lambda > DB: Update metadata [color: green]
Logs - Lambda: Metrics/Logs [color: gray]
```

## DynamoDB Model (ERD)

```
notation crows-feet
colorMode bold
styleMode plain
typeface clean

users {
  id string pk
  email string
}

creatorTours {
  uuid string pk
  creBy string
  upBy string
  slug string
  status string
  country string
  upAt number
}

publishedTours {
  uuid string pk
  creBy string
  upBy string
  slug string
  status string
  country string
  city string
  upAt number
  hashKey string
  geohash string
}

userActivity {
  PK string
  SK string
  userId string
  tourId string
  type string
  creAt number
}

creatorTours.uuid - publishedTours.uuid [color: green]
creatorTours.creBy > users.id [color: green]
creatorTours.upBy > users.id [color: green]
publishedTours.creBy > users.id [color: green]
publishedTours.upBy > users.id [color: green]
userActivity.userId > users.id [color: green]
userActivity.tourId > publishedTours.uuid [color: green]
```

## Upload Flow (Sequence)

```
autoNumber nested
colorMode bold
styleMode plain
typeface clean

Client [icon: monitor, color: gray] > APIGW [icon: aws-api-gateway, color: blue]: RequestPresignedURL
activate APIGW
loop [label: until valid, color: green] {
  APIGW > Lambda [icon: aws-lambda, color: orange]: GenerateURL
  activate Lambda
  Lambda > APIGW: URL
  deactivate Lambda
}
APIGW > Client: 200 with URL
deactivate APIGW

Client > Uploads [icon: aws-s3, color: blue]: PUT object
Uploads > Lambda [icon: aws-lambda, color: orange]: ObjectCreated
activate Lambda
par [label: process, color: green] {
  Lambda > DB [icon: aws-dynamodb, color: green]: Persist metadata
} and [label: notify, color: blue] {
  Lambda --> Client: Status update
}
deactivate Lambda
```

## API Read/Write Flow (Sequence)

```
autoNumber on
colorMode bold
styleMode plain
typeface clean

Client [icon: monitor, color: gray] > APIGW [icon: aws-api-gateway, color: blue]: Request
activate APIGW
alt [label: GET /items, color: blue] {
  APIGW > Lambda [icon: aws-lambda, color: orange]: Handle GET
  activate Lambda
  Lambda > DB [icon: aws-dynamodb, color: green]: Query
  Lambda < DB: Items
  Lambda > APIGW: 200 JSON
  deactivate Lambda
  APIGW > Client: 200
} else [label: POST /items, color: green] {
  APIGW > Lambda [icon: aws-lambda, color: orange]: Handle POST
  activate Lambda
  Lambda > DB [icon: aws-dynamodb, color: green]: PutItem
  Lambda > APIGW: 201
  deactivate Lambda
  APIGW > Client: 201
}
deactivate APIGW
```

## CI/CD with Terragrunt (BPMN)

```
colorMode bold
styleMode plain
typeface clean

Platform {
  CICD {
    PlanDev [type: activity, label: Plan dev]
    ApplyDev [type: activity, label: Apply dev]
    ApprovalGate [type: gateway, label: Approved?]
    PlanProd [type: activity, label: Plan prod]
    ApplyProd [type: activity, label: Apply prod]
  }
  Ops {
    ReviewChange [type: activity, label: Review]
    ApproveChange [type: event, label: Approve]
  }
}

PlanDev > ApplyDev: dev [color: "#3399ff"]
ApplyDev > ApprovalGate: evaluate [color: "#3399ff"]
ApprovalGate > PlanProd: yes [color: green]
PlanProd > ApplyProd: prod [color: green]
ReviewChange > ApproveChange: approve [color: orange]
ApproveChange > ApprovalGate: signal [color: orange]
```

## Environment Promotion (Flow Chart)

```
direction right
colorMode bold
styleMode plain
typeface clean

Start [shape: oval]
Plan [shape: rectangle]
ApplyDev [shape: rectangle]
Approval [shape: diamond]
ApplyProd [shape: rectangle]
End [shape: oval]

Start > Plan > ApplyDev > Approval > ApplyProd > End
Approval > End: no
```
