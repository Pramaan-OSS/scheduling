#!/bin/bash

echo "HOSTING_GIT_COMMIT_REF: $HOSTING_GIT_COMMIT_REF"

if [[ "$HOSTING_GIT_COMMIT_REF" == "staging" ]] ; then
  # Proceed with the build
    echo "✅ - Build can proceed"
    ./hosting.sh
  exit 1;

else
  # Don't build
  echo "🛑 - Build cancelled"
  exit 0;
fi
