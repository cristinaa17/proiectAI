# Folosim o versiune oficială de Node.js
FROM node:20-alpine

# Setăm folderul de lucru în interiorul containerului
WORKDIR /app

# Copiem fișierele cu pachete și le instalăm
COPY package*.json ./
RUN npm install

# Copiem restul proiectului
COPY . .

# Expunem portul pe care rulează Vite
EXPOSE 5173

# Comanda de pornire (flag-ul --host este vital pentru Docker)
CMD ["npm", "run", "dev", "--", "--host"]