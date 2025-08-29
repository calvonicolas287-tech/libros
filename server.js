require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const mercadopago = require('mercadopago');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🔗 Conexión MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error MongoDB:", err));

// 📌 Modelos
const UsuarioSchema = new mongoose.Schema({
  email: String,
  password: String,
  rol: { type: String, default: "usuario" }
});
const Usuario = mongoose.model("Usuario", UsuarioSchema);

const LibroSchema = new mongoose.Schema({
  titulo: String,
  descripcion: String,
  precio: Number,
  imagen: String
});
const Libro = mongoose.model("Libro", LibroSchema);

const CompraSchema = new mongoose.Schema({
  usuario: String,
  libros: Array,
  total: Number,
  fecha: { type: Date, default: Date.now }
});
const Compra = mongoose.model("Compra", CompraSchema);

// 🔐 Middleware JWT
function verificarToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}

// 🛒 MercadoPago Config
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

// 📚 Rutas
app.get('/libros', async (req, res) => {
  const libros = await Libro.find();
  res.json(libros);
});

// 🆕 Registro
app.post('/registro', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email y contraseña requeridos" });

  const existe = await Usuario.findOne({ email });
  if (existe) return res.status(400).json({ error: "Usuario ya existe" });

  const hash = await bcrypt.hash(password, 10);
  const nuevoUsuario = new Usuario({ email, password: hash, rol: "usuario" });
  await nuevoUsuario.save();

  const token = jwt.sign({ email, rol: "usuario" }, process.env.JWT_SECRET, { expiresIn: "2h" });
  res.json({ token });
});

// 🔐 Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await Usuario.findOne({ email });
  if (!user) return res.status(400).json({ error: "Usuario no encontrado" });

  const valido = await bcrypt.compare(password, user.password);
  if (!valido) return res.status(400).json({ error: "Contraseña incorrecta" });

  const token = jwt.sign({ email: user.email, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: "2h" });
  res.json({ token });
});

// 📖 Subir libro (solo admin)
app.post('/libros', verificarToken, async (req, res) => {
  if (req.user.rol !== "admin") return res.status(403).json({ error: "No autorizado" });

  const { titulo, descripcion, precio, imagen } = req.body;
  const nuevoLibro = new Libro({ titulo, descripcion, precio, imagen });
  await nuevoLibro.save();

  res.json({ mensaje: "Libro agregado", libro: nuevoLibro });
});

// 🛒 Crear pago MercadoPago
app.post('/crear-preferencia', verificarToken, async (req, res) => {
  const { cart } = req.body;
  const preference = {
    items: cart.map(libro => ({
      title: libro.titulo,
      unit_price: libro.precio,
      quantity: libro.quantity
    )),
    back_urls: {
      success: "https://tu-dominio.com/success",
      failure: "https://tu-dominio.com/failure",
    },
    auto_return: "approved"
  };

  try {
    const response = await mercadopago.preferences.create(preference);
    const total = cart.reduce((acc, l) => acc + l.precio * l.quantity, 0);

    const compra = new Compra({ usuario: req.user.email, libros: cart, total });
    await compra.save();

    res.json({ init_point: response.body.init_point });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear preferencia" });
  }
});

// 📜 Historial de compras
app.get('/historial', verificarToken, async (req, res) => {
  const compras = await Compra.find({ usuario: req.user.email });
  res.json(compras);
});

// 📊 Dashboard de admin
app.get('/dashboard', verificarToken, async (req, res) => {
  if (req.user.rol !== "admin") return res.status(403).json({ error: "No autorizado" });

  const compras = await Compra.find();
  const totalVentas = compras.reduce((acc, c) => acc + c.total, 0);

  const librosVendidos = {};
  compras.forEach(c => {
    c.libros.forEach(libro => {
      librosVendidos[libro.titulo] = (librosVendidos[libro.titulo] || 0) + libro.quantity;
    });
  });

  res.json({ totalVentas, librosVendidos });
});

// 📄 SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🚀 Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
