// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 📂 Servir archivos estáticos del frontend (carpeta "public")
app.use(express.static(path.join(__dirname, 'public')));

// 🔐 Middleware para verificar token
function verificarToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}

// 📚 Base de datos simulada
let libros = [
  {
    id: 1,
    titulo: 'El arte de programar',
    descripcion: 'Una guía completa para desarrolladores autodidactas.',
    precio: 1200,
    imagen: 'https://via.placeholder.com/150?text=Libro+1'
  },
  {
    id: 2,
    titulo: 'JavaScript avanzado',
    descripcion: 'Domina el lenguaje del navegador con ejemplos reales.',
    precio: 1500,
    imagen: 'https://via.placeholder.com/150?text=Libro+2'
  }
];

const historialCompras = {}; // email → array de compras

// 🔓 Ruta pública para obtener todos los libros
app.get('/libros', (req, res) => {
  res.json(libros);
});

// 🛒 Crear preferencia de pago (simulada)
app.post('/crear-preferencia', verificarToken, (req, res) => {
  const { cart } = req.body;
  const email = req.user.email;

  const preferenciaId = 'pref_' + Math.random().toString(36).substring(2);

  if (!historialCompras[email]) historialCompras[email] = [];
  historialCompras[email].push({
    fecha: new Date(),
    libros: cart,
    total: cart.reduce((acc, l) => acc + l.precio * l.quantity, 0)
  });

  res.json({ preferenciaId, init_point: `https://fake-checkout.com/${preferenciaId}` });
});

// 📜 Historial de compras
app.get('/historial', verificarToken, (req, res) => {
  const email = req.user.email;
  res.json(historialCompras[email] || []);
});

// 🧑‍💻 Subir nuevos libros (solo admin)
app.post('/libros', verificarToken, (req, res) => {
  const { titulo, descripcion, precio, imagen } = req.body;
  const email = req.user.email;

  if (email !== process.env.EMAIL_USER) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const nuevoLibro = {
    id: libros.length + 1,
    titulo,
    descripcion,
    precio,
    imagen
  };

  libros.push(nuevoLibro);
  res.json({ mensaje: 'Libro agregado', libro: nuevoLibro });
});

// 📊 Dashboard de ventas (solo admin)
app.get('/dashboard', verificarToken, (req, res) => {
  const email = req.user.email;
  if (email !== process.env.EMAIL_USER) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const todasLasCompras = Object.values(historialCompras).flat();
  const totalVentas = todasLasCompras.reduce((acc, c) => acc + c.total, 0);

  const librosVendidos = {};
  todasLasCompras.forEach(compra => {
    compra.libros.forEach(libro => {
      librosVendidos[libro.titulo] = (librosVendidos[libro.titulo] || 0) + libro.quantity;
    });
  });

  res.json({ totalVentas, librosVendidos });
});

// 🔐 Login simulado
app.post('/login', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
});

// 🆕 Registro simulado
app.post('/registro', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
});

// 📄 Para cualquier otra ruta que no sea API, enviar index.html del frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🚀 Inicio del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
