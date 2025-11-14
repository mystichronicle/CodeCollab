FROM rust:1.91-slim as builder

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifest files
COPY Cargo.toml Cargo.lock ./

# Create dummy main to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Copy actual source code
COPY src ./src

# Build the application
RUN cargo build --release

# Final stage
FROM debian:bookworm-slim

# Install language runtimes and build tools
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    wget \
    git \
    # Python
    python3 \
    python3-pip \
    # Node.js (comes with Debian)
    nodejs \
    npm \
    # C/C++
    gcc \
    g++ \
    make \
    # Java
    openjdk-17-jdk \
    # Go
    golang \
    # Elixir & Erlang
    elixir \
    erlang \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python command
RUN ln -s /usr/bin/python3 /usr/bin/python

# Install TypeScript globally
RUN npm install -g typescript ts-node

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Zig (latest stable)
RUN wget https://ziglang.org/download/0.13.0/zig-linux-x86_64-0.13.0.tar.xz && \
    tar -xf zig-linux-x86_64-0.13.0.tar.xz && \
    mv zig-linux-x86_64-0.13.0 /usr/local/zig && \
    ln -s /usr/local/zig/zig /usr/local/bin/zig && \
    rm zig-linux-x86_64-0.13.0.tar.xz

# Install V (vlang)
RUN git clone https://github.com/vlang/v /opt/vlang && \
    cd /opt/vlang && \
    make && \
    ln -s /opt/vlang/v /usr/local/bin/v

WORKDIR /root/

COPY --from=builder /app/target/release/execution-service .

EXPOSE 8004

CMD ["./execution-service"]
