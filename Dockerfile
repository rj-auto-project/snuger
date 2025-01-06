# Use a smaller Node.js Alpine image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of the application files
COPY . .

# Expose the port (default for Fastify is 3000)
EXPOSE 3000

# Run the application
CMD ["npm", "start"]
