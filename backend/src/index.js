import express from 'express';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();      
const { Pool } = pkg;

const app = express();
app.use(express.json());

// Conecta a Postgres usando las vars de entorno
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Endpoints para los dropdowns de los filtros
// ////////////////////////////////////////////////////

// Obtener todas las categorías
app.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT nombre_categoria FROM categoria;'
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories', err);
    return res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// Obtener todas las marcas
app.get('/brands', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT nombre_marca FROM marcas;'
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching brands', err);
    return res.status(500).json({ error: 'Error al obtener marcas' });
  }
});

// Obtener todos los géneros
app.get('/genders', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT etiqueta FROM genero;'
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching genders', err);
    return res.status(500).json({ error: 'Error al obtener géneros' });
  }
});

// /////////////////////////////////////////////////

// ENDPOINTS PARA LOS REPORTES
// ////////////////////////////////////////////////////
// Endpoint: Clientes con mayor cantidad de gastos
/*
Rango de meses hacia tras
categoria de producto
marca de producto
monto minimo
*/
app.get('/top-customers', async (req, res) => {
  try {
    const { monthsAgo, category, brand, minAmount } = req.query;

    // Calcular fecha de inicio según monthsAgo (por defecto 1 mes)
    const now = new Date();
    const date = new Date(
      now.setMonth(now.getMonth() - (monthsAgo ? parseInt(monthsAgo) : 1))
    );

    // Condiciones dinámicas para WHERE
    const whereConditions = ['v.fecha_realizacion >= $1'];
    const values = [date];
    let idx = 2;

    if (category) {
      whereConditions.push(`cat.nombre_categoria = $${idx}`);
      values.push(category);
      idx++;
    }

    if (brand) {
      whereConditions.push(`m.nombre_marca = $${idx}`);
      values.push(brand);
      idx++;
    }

    // Condiciones dinámicas para HAVING (filtros por agregados)
    const havingConditions = [];
    if (minAmount) {
      havingConditions.push(`SUM(vd.monto) >= $${idx}`);
      values.push(parseFloat(minAmount));
      idx++;
    }

    // Construir la consulta SQL
    let query = `
      SELECT
        c.id,
        c.nombre,
        c.apellido,
        SUM(vd.monto) AS total_gastado
      FROM clientes c
      JOIN ventas v ON c.id = v.id_cliente
      JOIN venta_detalles vd ON v.id = vd.id_venta
      JOIN prendas p ON vd.id_prenda = p.id
      JOIN categoria cat ON p.id_categoria = cat.id
      JOIN marcas m ON p.id_marca = m.id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY c.id, c.nombre, c.apellido`;

    if (havingConditions.length > 0) {
      query += `
      HAVING ${havingConditions.join(' AND ')}`;
    }

    query += `
      ORDER BY total_gastado DESC
      LIMIT 10;
    `;

    const result = await pool.query(query, values);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error en /top-customers', err);
    return res.status(500).json({ error: 'Error al obtener los clientes con mayores gastos' });
  }
});

// Endpoint:Productos mas vendidos
/*
Rango de meses hacia atras
categoria de producto
marca de producto
precio minimo
*/
app.get('/top-products', async (req, res) => {
  try {
    const { monthsAgo, category, brand, minAmount } = req.query;

    const now = new Date();
    const date = new Date(
      now.setMonth(now.getMonth() - (monthsAgo ? parseInt(monthsAgo) : 1))
    );

    // Condicion de fecha
    const whereConditions = ['v.fecha_realizacion >= $1'];
    const values = [date];
    let idx = 2;
    const havingConditions = [];

    // Condiciones para categoria
    if (category) {
      whereConditions.push(`cat.nombre_categoria = $${idx}`);
      values.push(category);
      idx++;
    }

    // Condiciones para marca
    if (brand) {
      whereConditions.push(`m.nombre_marca = $${idx}`);
      values.push(brand);
      idx++;
    }

    // Condiciones para monto
    if (minAmount) {
      havingConditions.push(`SUM(vd.monto) >= $${idx}`);
      values.push(parseFloat(minAmount));
      idx++;
    }

    // Construir la consulta SQL
    let query = `
      SELECT
        p.id,
        p.nombre_prenda,
        SUM(vd.monto) AS total_vendido,
        SUM(vd.cantidad) AS unidades_vendidas
      FROM prendas AS p
      JOIN venta_detalles AS vd ON p.id = vd.id_prenda
      JOIN ventas AS v ON vd.id_venta = v.id
      JOIN categoria AS cat ON p.id_categoria = cat.id
      JOIN marcas AS m ON p.id_marca = m.id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY p.id, p.nombre_prenda`;

    if (havingConditions.length > 0) {
      query += `
      HAVING ${havingConditions.join(' AND ')}`;
    }

    query += `
      ORDER BY total_vendido DESC
      LIMIT 10;
    `;

    const result = await pool.query(query, values);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error en /top-products', err);
    return res.status(500).json({ error: 'Error al obtener los productos mas vendidos' });
  }
});

// Endpoint: Inventatio Actual
/*
Categoria de producto
Marca de Producto
Genero de producto
Precio Minimo
*/
app.get('/inventory', async (req, res) => {
  try {
    const { category, brand, gender, minAmount } = req.query;

    // Por default min Amount es 0
    const minAmountValue = minAmount ? parseFloat(minAmount) : 0;
    const whereConditions = ['p.precio_actual >= $1'];
    const values = [minAmountValue];
    let idx = 2;

    // Condicion de categoria
    if (category) {
      whereConditions.push(`cat.nombre_categoria = $${idx}`);
      values.push(category);
      idx++;
    }

    // Condicion de marca
    if (brand) {
      whereConditions.push(`m.nombre_marca = $${idx}`);
      values.push(brand);
      idx++;
    }

    // Condicion de genero
    if (gender) {
      whereConditions.push(`g.etiqueta = $${idx}`);
      values.push(gender);
      idx++;
    }

    // Construir la consulta SQL
    let query = `
      SELECT
      p.id,
      p.nombre_prenda,
      p.precio_actual,
      cat.nombre_categoria AS category,
      m.nombre_marca AS brand,
      g.etiqueta AS gender,
      i.stock
      FROM prendas p
      JOIN inventario i ON p.id = i.id_prenda
      JOIN categoria cat ON p.id_categoria = cat.id
      JOIN marcas m ON p.id_marca = m.id
      JOIN genero g ON p.id_genero = g.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY i.stock DESC
      LIMIT 10;
    `;

    const result = await pool.query(query, values);
    return res.json(result.rows);

  } catch (err) {
    console.error('Error en /top-products', err);
    return res.status(500).json({ error: 'Error al obtener los productos mas vendidos' });
  }
});

// Endpoint: Clientes mas frecuentes
/*
Rango de meses hacia atras
Monto minimo gastado en total
Categoria de Productos
Genero de productos
*/
app.get('/frequent-customers', async (req, res) => {
  try {
    const { monthsAgo, minAmount, category, gender } = req.query;

    // Hace un mes por default
    const now = new Date();
    const fromDate = new Date(
      now.setMonth(now.getMonth() - (monthsAgo ? parseInt(monthsAgo) : 1))
    );

    // Condicion de fecha
    const whereConditions = ['v.fecha_realizacion >= $1'];
    const values = [fromDate];
    let idx = 2;

    // Condicion de categoria
    if (category) {
      whereConditions.push(`cat.nombre_categoria = $${idx}`);
      values.push(category);
      idx++;
    }

    // Condicion de genero
    if (gender) {
      whereConditions.push(`g.etiqueta = $${idx}`);
      values.push(gender);
      idx++;
    }

    // Condicion de monto minimo
    const havingConditions = [];
    if (minAmount) {
      havingConditions.push(`SUM(vd.monto) >= $${idx}`);
      values.push(parseFloat(minAmount));
      idx++;
    }

    // Construir la consulta SQL
    let query = `
      SELECT
        c.id,
        c.nombre,
        c.apellido,
        COUNT(DISTINCT v.id)        AS total_compras,
        SUM(vd.monto)               AS total_gastado
      FROM clientes c
      JOIN ventas v       ON c.id = v.id_cliente
      JOIN venta_detalles vd ON v.id = vd.id_venta
      JOIN prendas p      ON vd.id_prenda = p.id
      JOIN categoria cat  ON p.id_categoria = cat.id
      JOIN genero g       ON p.id_genero = g.id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY c.id, c.nombre, c.apellido`;

    if (havingConditions.length) {
      query += `
      HAVING ${havingConditions.join(' AND ')}`;
    }

    query += `
      ORDER BY total_compras DESC
      LIMIT 10;
    `;

    const { rows } = await pool.query(query, values);
    return res.json(rows);

  } catch (err) {
    console.error('Error en /frequent-customers', err);
    return res.status(500).json({ error: 'Error al obtener clientes frecuentes' });
  }
});

// Endpoint: Cambios en el historial de precios
/*
Rango de meses hacia atras
Marca
Categoria
Genero
*/
app.get('/price-history', async (req, res) => {
  try {
    const { monthsAgo, brand, category, gender } = req.query;

    // Hace un mes por default
    const now = new Date();
    const fromDate = new Date(
      now.setMonth(now.getMonth() - (monthsAgo ? parseInt(monthsAgo) : 1))
    );

    // Condicion de fecha
    const whereConditions = ['hp.fecha_realizacion >= $1'];
    const values = [fromDate];
    let idx = 2;

    // Condicion de marca
    if (brand) {
      whereConditions.push(`m.nombre_marca = $${idx}`);
      values.push(brand);
      idx++;
    }

    // Condicion de categoria
    if (category) {
      whereConditions.push(`cat.nombre_categoria = $${idx}`);
      values.push(category);
      idx++;
    }

    // Condicion de genero
    if (gender) {
      whereConditions.push(`g.etiqueta = $${idx}`);
      values.push(gender);
      idx++;
    }

    // Montar consulta
    const query = `
      SELECT
      hp.id,
      hp.id_prenda,
      p.nombre_prenda,
      hp.fecha_realizacion,
      hp.precio_pasado,
      hp.precio_nuevo,
      hp.diferencia_precio
      FROM historial_precios hp
      JOIN prendas p ON hp.id_prenda = p.id
      JOIN marcas m ON p.id_marca = m.id
      JOIN categoria cat ON p.id_categoria = cat.id
      JOIN genero g ON p.id_genero = g.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY hp.fecha_realizacion DESC
      LIMIT 20;
    `;

    const { rows } = await pool.query(query, values);
    return res.json(rows);
  } catch (err) {
    console.error('Error en /price-history', err);
    return res.status(500).json({ error: 'Error al obtener cambios de historial de precios' });
  }
});
// /////////////////////////////////////////////////////////////////

app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
