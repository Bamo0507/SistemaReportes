import express from 'express';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();      
const { Pool } = pkg;

const app = express();
app.use(express.json());

// conecta a Postgres usando las vars de entorno
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const apiUrl = process.env.API_URL || "http://localhost:3000";

// Clientes con mayor cantidad de gastos
/*
- Meses: hace cuantos meses se desea analizar (hace 1, 2, 3 ... meses)
- Categoria de producto (pantalones, camisas, etc)
- Marca de producto (Nike, Adidas, etc)
- Monto minimo de compra
*/
app.get('/top-customers', async (req, res) => {
  try {
    // Extraer filtros desde query string
    const { monthsAgo, category, brand, minAmount } = req.query;

    // Calcular fecha de inicio según monthsAgo (por defecto 1 mes)
    const now = new Date();
    const date = new Date(now.setMonth(now.getMonth() - (monthsAgo ? parseInt(monthsAgo) : 1)));

    // Construir condiciones dinámicas
    const conditions = ['v.fecha_realizacion >= $1'];
    const values = [date];

    if (category) {
      conditions.push(`cat.nombre_categoria = $2`);
      values.push(category);
    }

    if (brand) {
      conditions.push(`m.nombre_marca = $3`);
      values.push(brand);
    }

    if (minAmount) {
      conditions.push(`SUM(vd.monto) >= $4`);
      values.push(parseFloat(minAmount));
    }

    // Consulta SQL con joins según esquema
    const query = `
      SELECT 
        c.id, 
        c.nombre, 
        c.apellido,
        SUM(vd.monto) AS total_gastado

      FROM clientes AS c

        JOIN ventas AS v ON c.id = v.id_cliente
        JOIN venta_detalles AS vd ON v.id = vd.id_venta
        JOIN prendas AS p ON vd.id_prenda = p.id
        JOIN categoria AS cat ON p.id_categoria = cat.id
        JOIN marcas AS m ON p.id_marca = m.id

      WHERE ${conditions.join(' AND ')}
      -- Preguntar Erick por que era necesario en el group by
      GROUP BY c.id, c.nombre, c.apellido
      ORDER BY total_gastado DESC
      LIMIT 10;
    `;

    // Ejecutar consulta
    const result = await pool.query(query, values);
    res.json(result.rows);

  } catch (err) {
    console.error('Error en /top-customers', err);
    res.status(500).json({ error: 'Error al obtener los clientes con mayores gastos' });
  }
});



app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// todo: meter en la configuracion del .env y en .env.example
const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
