#!/bin/bash
echo "Initializing AWS LocalStack Infrastructure..."

# Wait for LocalStack to be fully ready
# Requires awslocal to be installed on the machine running this if run manually,
# or we use the localstack internal awslocal if this runs inside the container.

awslocal dynamodb create-table \
    --table-name ExpenseTrackerTable \
    --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
    --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

echo "DynamoDB ExpenseTrackerTable created successfully."

# Simulate creating a local User Pool for Amplify
USER_POOL_ID=$(awslocal cognito-idp create-user-pool --pool-name ExpenseTrackerLocalPool --region us-east-1 --query 'UserPool.Id' --output text)
echo "Cognito UserPool created: $USER_POOL_ID"

CLIENT_ID=$(awslocal cognito-idp create-user-pool-client --user-pool-id "$USER_POOL_ID" --client-name LocalClient --query 'UserPoolClient.ClientId' --output text)
echo "Cognito Client created: $CLIENT_ID"

echo "Initialization Complete!"
