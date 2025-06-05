FROM node:23.10.0

# Set working directory
WORKDIR /app

# Copy package.json files first to leverage caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the backend port
EXPOSE 8081

# Start the backend
CMD ["npm", "start"]
