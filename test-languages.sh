#!/bin/bash

# Test all language runtimes in CodeCollab Execution Service

echo "======================================"
echo "  Testing All Language Runtimes"
echo "======================================"
echo ""

# Test Python
echo "🐍 Testing Python..."
result=$(curl -s -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello from Python!\")\nprint(2 + 2)",
    "language": "python"
  }')
exit_code=$(echo "$result" | jq -r '.exit_code')
if [ "$exit_code" == "0" ]; then
  echo "✅ PASS - $(echo "$result" | jq -r '.stdout' | tr '\n' ' ')"
else
  echo "❌ FAIL - $(echo "$result" | jq -r '.stderr' | head -3)"
fi
echo ""

# Test JavaScript
echo "📜 Testing JavaScript..."
result=$(curl -s -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "console.log(\"Hello from JavaScript!\"); console.log(2 + 2);",
    "language": "javascript"
  }')
exit_code=$(echo "$result" | jq -r '.exit_code')
if [ "$exit_code" == "0" ]; then
  echo "✅ PASS - $(echo "$result" | jq -r '.stdout' | tr '\n' ' ')"
else
  echo "❌ FAIL - $(echo "$result" | jq -r '.stderr' | head -3)"
fi
echo ""

# Test TypeScript
echo "🔷 Testing TypeScript..."
result=$(curl -s -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const message: string = \"Hello from TypeScript!\"; console.log(message); console.log(2 + 2);",
    "language": "typescript"
  }')
exit_code=$(echo "$result" | jq -r '.exit_code')
if [ "$exit_code" == "0" ]; then
  echo "✅ PASS - $(echo "$result" | jq -r '.stdout' | tr '\n' ' ')"
else
  echo "❌ FAIL - $(echo "$result" | jq -r '.stderr' | head -3)"
fi
echo ""

# Test Go
echo "🐹 Testing Go..."
result=$(curl -s -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "package main\nimport \"fmt\"\nfunc main() { fmt.Println(\"Hello from Go!\") }",
    "language": "go"
  }')
exit_code=$(echo "$result" | jq -r '.exit_code')
if [ "$exit_code" == "0" ]; then
  echo "✅ PASS - $(echo "$result" | jq -r '.stdout' | tr '\n' ' ')"
else
  echo "❌ FAIL - $(echo "$result" | jq -r '.stderr' | head -3)"
fi
echo ""

# Test Rust
echo "🦀 Testing Rust..."
result=$(curl -s -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "fn main() { println!(\"Hello from Rust!\"); }",
    "language": "rust"
  }')
exit_code=$(echo "$result" | jq -r '.exit_code')
if [ "$exit_code" == "0" ]; then
  echo "✅ PASS - $(echo "$result" | jq -r '.stdout' | tr '\n' ' ')"
else
  echo "❌ FAIL - $(echo "$result" | jq -r '.stderr' | head -3)"
fi
echo ""

# Test C
echo "🔧 Testing C..."
result=$(curl -s -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "#include <stdio.h>\nint main() { printf(\"Hello from C!\\n\"); return 0; }",
    "language": "c"
  }')
exit_code=$(echo "$result" | jq -r '.exit_code')
if [ "$exit_code" == "0" ]; then
  echo "✅ PASS - $(echo "$result" | jq -r '.stdout' | tr '\n' ' ')"
else
  echo "❌ FAIL - $(echo "$result" | jq -r '.stderr' | head -3)"
fi
echo ""

# Test C++
echo "⚙️  Testing C++..."
result=$(curl -s -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "#include <iostream>\nint main() { std::cout << \"Hello from C++!\" << std::endl; return 0; }",
    "language": "cpp"
  }')
exit_code=$(echo "$result" | jq -r '.exit_code')
if [ "$exit_code" == "0" ]; then
  echo "✅ PASS - $(echo "$result" | jq -r '.stdout' | tr '\n' ' ')"
else
  echo "❌ FAIL - $(echo "$result" | jq -r '.stderr' | head -3)"
fi
echo ""

# Test Java
echo "☕ Testing Java..."
result=$(curl -s -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "public class Main { public static void main(String[] args) { System.out.println(\"Hello from Java!\"); } }",
    "language": "java"
  }')
exit_code=$(echo "$result" | jq -r '.exit_code')
if [ "$exit_code" == "0" ]; then
  echo "✅ PASS - $(echo "$result" | jq -r '.stdout' | tr '\n' ' ')"
else
  echo "❌ FAIL - $(echo "$result" | jq -r '.stderr' | head -3)"
fi
echo ""

# Test Zig
echo "⚡ Testing Zig..."
result=$(curl -s -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const std = @import(\"std\");\npub fn main() !void { const stdout = std.io.getStdOut().writer(); try stdout.print(\"Hello from Zig!\\n\", .{}); }",
    "language": "zig"
  }')
exit_code=$(echo "$result" | jq -r '.exit_code')
if [ "$exit_code" == "0" ]; then
  echo "✅ PASS - $(echo "$result" | jq -r '.stdout' | tr '\n' ' ')"
else
  echo "❌ FAIL - $(echo "$result" | jq -r '.stderr' | head -3)"
fi
echo ""

# Test V Lang
echo "⚡ Testing V Lang..."
result=$(curl -s -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "fn main() { println(\"Hello from V!\") }",
    "language": "v"
  }')
exit_code=$(echo "$result" | jq -r '.exit_code')
if [ "$exit_code" == "0" ]; then
  echo "✅ PASS - $(echo "$result" | jq -r '.stdout' | tr '\n' ' ')"
else
  echo "❌ FAIL - $(echo "$result" | jq -r '.stderr' | head -3)"
fi
echo ""

# Test Elixir
echo "💧 Testing Elixir..."
result=$(curl -s -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "IO.puts \"Hello from Elixir!\"",
    "language": "elixir"
  }')
exit_code=$(echo "$result" | jq -r '.exit_code')
if [ "$exit_code" == "0" ]; then
  echo "✅ PASS - $(echo "$result" | jq -r '.stdout' | tr '\n' ' ')"
else
  echo "❌ FAIL - $(echo "$result" | jq -r '.stderr' | head -3)"
fi
echo ""

echo "======================================"
echo "  Test Summary Complete"
echo "======================================"
