FROM node:18-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package files first
COPY package*.json ./
    
# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the port (default for Node.js apps is 3000)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
