#!/bin/bash

# Check if AWS CLI is installed
if ! [ -x "$(command -v aws)" ]; then
  echo 'Error: AWS CLI is not installed.' >&2
  exit 1
fi

# Invoke Lambda function
# Make sure BuildKite agent has permission to invoke Lambda function
lambda_invocation_status=$(aws lambda invoke --function-name migrator-function scripts/output.json)

# Check if invocation is successful
if [[ $lambda_invocation_status == *"Unhandled"* ]]; then
  echo "Lambda function migrator-function failed, please check scripts/output.json for the error (if running script on local), or check the BuildKite artifacts (if running on BuildKite pipeline)."
else
  echo "Lambda function successfully run."
fi

exit 1
