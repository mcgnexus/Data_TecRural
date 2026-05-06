# Security Test Suite

## Test Cases

### 1. Token Exposure Test
```bash
# Test that token is NOT in response
curl -X POST http://localhost:3000/api/iot/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "node_code": "TR-FITO-001",
    "token": "cambia-este-token-largo",
    "air_temp_c": 24.6
  }' | grep -q "token" && echo "FAIL: Token in response" || echo "PASS: Token not in response"
```

### 2. Token in Raw Data Test
```bash
# Insert data and check that raw JSONB doesn't contain token
psql $DATABASE_URL -c "SELECT raw FROM sensor_readings LIMIT 1" | grep -q "token" && echo "FAIL: Token in raw data" || echo "PASS: Token not in raw data"
```

### 3. Invalid JSON Test
```bash
# Test malformed JSON
curl -X POST http://localhost:3000/api/iot/ingest \
  -H "Content-Type: application/json" \
  -d '{"invalid": json}' \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 400 Bad Request
```

### 4. Missing Required Fields Test
```bash
# Test without node_code
curl -X POST http://localhost:3000/api/iot/ingest \
  -H "Content-Type: application/json" \
  -d '{"token": "test"}' \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 400 Bad Request
```

### 5. Wrong Token Test
```bash
# Test with wrong token
curl -X POST http://localhost:3000/api/iot/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "node_code": "TR-FITO-001",
    "token": "wrong-token",
    "air_temp_c": 24.6
  }' \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 401 Unauthorized
```

### 6. Non-existent Node Test
```bash
# Test with non-existent node
curl -X POST http://localhost:3000/api/iot/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "node_code": "NON-EXISTENT",
    "token": "cambia-este-token-largo",
    "air_temp_c": 24.6
  }' \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 401 Unauthorized
```

### 7. Invalid Range Test
```bash
# Test air_humidity_pct > 100
curl -X POST http://localhost:3000/api/iot/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "node_code": "TR-FITO-001",
    "token": "cambia-este-token-largo",
    "air_humidity_pct": 150
  }' \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 400 Bad Request
```

### 8. measured_at Range Test
```bash
# Test with date in far past
curl -X POST http://localhost:3000/api/iot/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "node_code": "TR-FITO-001",
    "token": "cambia-este-token-largo",
    "air_temp_c": 24.6,
    "measured_at": "2020-01-01T00:00:00Z"
  }' \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 400 Bad Request

# Test with date in far future
curl -X POST http://localhost:3000/api/iot/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "node_code": "TR-FITO-001",
    "token": "cambia-este-token-largo",
    "air_temp_c": 24.6,
    "measured_at": "2050-01-01T00:00:00Z"
  }' \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 400 Bad Request
```

### 9. Limit Parameter Test
```bash
# Test with limit > 500
curl "http://localhost:3000/api/iot/readings?node_code=TR-FITO-001&limit=1000" \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 200 OK, but limited to 500

# Test with limit < 1
curl "http://localhost:3000/api/iot/readings?node_code=TR-FITO-001&limit=0" \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 200 OK, but defaults to 100

# Test with invalid limit
curl "http://localhost:3000/api/iot/readings?node_code=TR-FITO-001&limit=invalid" \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 200 OK, but defaults to 100
```

### 10. node_code Validation Test
```bash
# Test with special characters
curl "http://localhost:3000/api/iot/latest?node_code=TR-FITO-001;DROP%20TABLE%20nodes" \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 400 Bad Request

# Test with very long node_code
curl "http://localhost:3000/api/iot/latest?node_code=$(python3 -c 'print("A"*100)')" \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 400 Bad Request
```

### 11. SQL Injection Test
```bash
# Test SQL injection attempts
curl -X POST http://localhost:3000/api/iot/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "node_code": "TR-FITO-001\"; DROP TABLE nodes; --",
    "token": "cambia-este-token-largo",
    "air_temp_c": 24.6
  }' \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 400 Bad Request

# Verify tables still exist
psql $DATABASE_URL -c "\dt nodes" && echo "PASS: Tables intact" || echo "FAIL: Tables dropped"
```

### 12. Multi-node Support Test
```bash
# Test with multiple nodes
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/iot/ingest \
    -H "Content-Type: application/json" \
    -d "{
      \"node_code\": \"TR-FITO-00$i\",
      \"token\": \"cambia-este-token-largo\",
      \"air_temp_c\": $((20 + i * 2))
    }"
done

# Verify different nodes can send data
curl "http://localhost:3000/api/iot/latest?node_code=TR-FITO-001"
curl "http://localhost:3000/api/iot/latest?node_code=TR-FITO-002"
curl "http://localhost:3000/api/iot/latest?node_code=TR-FITO-003"
```

### 13. DATABASE_URL Exposure Test
```bash
# Check that DATABASE_URL is not exposed in any response
curl http://localhost:3000/api/iot/latest?node_code=TR-FITO-001 | grep -i "database" && echo "FAIL: Database info exposed" || echo "PASS: Database info not exposed"

# Check client-side JavaScript doesn't contain DATABASE_URL
grep -r "DATABASE_URL" .next/static/ 2>/dev/null && echo "FAIL: DATABASE_URL in client bundle" || echo "PASS: DATABASE_URL not in client bundle"
```

### 14. Debug Mode Test
```bash
# Test with debug mode off (default)
curl -X POST http://localhost:3000/api/iot/ingest \
  -H "Content-Type: application/json" \
  -d '{"invalid": data}' \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 400 with generic "Invalid data" message

# Test with debug mode on
IOT_API_DEBUG=true curl -X POST http://localhost:3000/api/iot/ingest \
  -H "Content-Type: application/json" \
  -d '{"invalid": data}' \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: Same response (debug only affects server logs)
```

## Running All Tests

```bash
# Set environment
export DATABASE_URL="your_database_url"
export IOT_API_DEBUG="false"

# Start server
npm run dev &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Run tests
echo "Running security tests..."
# Copy and paste the test cases above

# Cleanup
kill $SERVER_PID
```

## Expected Results Summary

| Test | Expected Status | Notes |
|------|----------------|-------|
| Token in response | FAIL (should not contain token) | ✅ PASS: Token not in response |
| Token in raw data | FAIL (should not contain token) | ✅ PASS: Token not in raw data |
| Invalid JSON | 400 | ✅ PASS |
| Missing fields | 400 | ✅ PASS |
| Wrong token | 401 | ✅ PASS |
| Non-existent node | 401 | ✅ PASS |
| Invalid range | 400 | ✅ PASS |
| measured_at range | 400 | ✅ PASS |
| Limit > 500 | 200 (limited to 500) | ✅ PASS |
| Invalid limit | 200 (defaults to 100) | ✅ PASS |
| node_code special chars | 400 | ✅ PASS |
| SQL injection | 400 | ✅ PASS |
| Multi-node support | Multiple 201 | ✅ PASS |
| DATABASE_URL exposure | Not exposed | ✅ PASS |
| Debug mode off | Generic errors | ✅ PASS |