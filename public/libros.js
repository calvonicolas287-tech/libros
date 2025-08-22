const contenedor = document.getElementById('libros-container');

function renderizarLibros(libros) {
  contenedor.innerHTML = '';
  libros.forEach(libro => {
    const card = document.createElement('div');
    card.className = 'bg-white p-4 rounded shadow hover:shadow-lg';
    card.innerHTML = `
      <img src="${libro.imagen}" alt="${libro.titulo}" class="w-full h-48 object-cover rounded mb-2"/>
      <h3 class="text-xl font-bold">${libro.titulo}</h3>
      <p class="text-gray-700 mb-2">${libro.descripcion}</p>
      <p class="font-semibold mb-2">Precio: $${libro.precio.toFixed(2)}</p>
      <button onclick="addToCart(${libro.id})" class="bg-blue-600 text-white px-3 py-1 rounded">Agregar al carrito</button>
      <button onclick="verDetalle(${libro.id})" class="ml-2 text-blue-600 hover:underline">Ver más</button>
    `;
    contenedor.appendChild(card);
  });
}

function addToCart(id) {
  fetch('/libros')
    .then(res => res.json())
    .then(libros => {
      const libro = libros.find(l => l.id === id);
      if (!libro) return alert('Libro no encontrado');

      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const existente = cart.find(item => item.id === id);

      if (existente) {
        existente.quantity += 1;
      } else {
        cart.push({ id: libro.id, title: libro.titulo, price: libro.precio, quantity: 1 });
      }

      localStorage.setItem('cart', JSON.stringify(cart));
      alert(`"${libro.titulo}" agregado al carrito`);
    })
    .catch(() => alert('Error al agregar al carrito'));
}

function verDetalle(id) {
  fetch('/libros')
    .then(res => res.json())
    .then(libros => {
      const libro = libros.find(l => l.id === id);
      if (!libro) return alert('Libro no encontrado');

      localStorage.setItem('libroDetalle', JSON.stringify(libro));
      window.location.href = 'detalle.html';
    })
    .catch(() => alert('Error al cargar el detalle'));
}

document.addEventListener('DOMContentLoaded', () => {
  fetch('/libros')
    .then(res => res.json())
    .then(renderizarLibros)
    .catch(() => {
      contenedor.innerHTML = '<p class="text-red-500">Error al cargar los libros</p>';
    });
});