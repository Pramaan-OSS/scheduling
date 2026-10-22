#!/bin/sh
set -eu
umask 077
exec node scripts/generated/run-local.mjs
