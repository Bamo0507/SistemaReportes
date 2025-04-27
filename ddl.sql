-- INFO BASE
-- //////////////////////////////////////
-- Saber si la prenda es de adulto o nino
CREATE TABLE rango_edad (
    id SERIAL PRIMARY KEY,
    etiqueta VARCHAR(50) NOT NULL UNIQUE
);

-- Saber si la prenda es de hombre o mujer
CREATE TABLE genero (
    id SERIAL PRIMARY KEY,
    etiqueta VARCHAR(50) NOT NULL UNIQUE
);

-- Categorias de prendas como camisas, pantalones, etc
CREATE TABLE categoria (
    id SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(50) NOT NULL UNIQUE
);

-- Marcas de ropa como zara, adidas, etc...
CREATE TABLE marcas (
    id SERIAL PRIMARY KEY,
    nombre_marca VARCHAR(50) NOT NULL UNIQUE
);

-- Tipos de cambio en el stock (venta o ajuste)
CREATE TABLE tipos_cambio_stock (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL UNIQUE
);

-- Tabla de clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL
);
-- /////////////////////////////////////

-- Info basica de clientes
-- /////////////////////////////////////
-- Tabla de telefonos de clientes
CREATE TABLE cliente_telefonos (
    id SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES clientes(id),
    telefono VARCHAR(50) NOT NULL,
    CONSTRAINT unique_cliente_telefono UNIQUE (id_cliente, telefono)
);

-- Tabla de direcciones de clientes
CREATE TABLE cliente_direcciones (
    id SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES clientes(id),
    direccion VARCHAR(50) NOT NULL
);

-- Tabla de correos de clientes
CREATE TABLE cliente_correos (
    id SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES clientes(id),
    correo VARCHAR(50) NOT NULL,
    CONSTRAINT unique_cliente_correo UNIQUE (id_cliente, correo)
);
-- /////////////////////////////////////

-- INFO DE PRODUCTOS E INVENTARIO
-- /////////////////////////////////////
-- Tabla de prendas
CREATE TABLE prendas (
    id SERIAL PRIMARY KEY,
    nombre_prenda VARCHAR(55) NOT NULL,
    descripcion VARCHAR(100) NOT NULL,
    precio_actual NUMERIC(6,2) NOT NULL CHECK (precio_actual >= 0),
    id_marca INT NOT NULL REFERENCES marcas(id),
    id_categoria INT NOT NULL REFERENCES categoria(id),
    id_edad INT NOT NULL REFERENCES rango_edad(id),
    id_genero INT NOT NULL REFERENCES genero(id)
);

-- Tabla de stock de prendas
CREATE TABLE inventario (
    id SERIAL PRIMARY KEY,
    id_prenda INT NOT NULL UNIQUE REFERENCES prendas(id),
    stock INT NOT NULL CHECK (stock >= 0)
);
-- /////////////////////////////////////

-- HISTORIALES
-- /////////////////////////////////////
-- Cambios de precios
CREATE TABLE historial_precios (
    id SERIAL PRIMARY KEY,
    id_prenda INT NOT NULL REFERENCES prendas(id),
    fecha_realizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    precio_pasado NUMERIC(6,2) NOT NULL,
    precio_nuevo NUMERIC(6,2) NOT NULL, 
    diferencia_precio NUMERIC(6,2) NOT NULL
);

-- Cambios de stock
CREATE TABLE historial_stock (
    id SERIAL PRIMARY KEY,
    id_prenda INT NOT NULL REFERENCES prendas(id),
    id_tipo_cambio INT NOT NULL REFERENCES tipos_cambio_stock(id),
    fecha_realizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stock_pasado INT NOT NULL,
    stock_nuevo INT NOT NULL,
    diferencia_stock INT NOT NULL
);
-- /////////////////////////////////////

-- INFO DE VENTAS
-- /////////////////////////////////////
-- Tabla de ventas
CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES clientes(id),
    id_direccion INT REFERENCES cliente_direcciones(id), -- NULL se tomara como retiro en tienda
    fecha_realizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de detalle de ventas
CREATE TABLE venta_detalles (
    id SERIAL PRIMARY KEY,
    id_venta INT NOT NULL REFERENCES ventas(id),
    id_prenda INT NOT NULL REFERENCES prendas(id),
    precio_venta NUMERIC(6,2) NOT NULL CHECK (precio_venta > 0), -- El precio bajo el que se realizo la venta
    cantidad INT NOT NULL CHECK (cantidad > 0),
    monto NUMERIC(6,2) NOT NULL -- Se calculara con un trigger
);

-- ///////////////////////////////////



-- FUNCIONES CON SUS TRIGGERS
-- ///////////////////////////////////
-- Trigger para registrar cambios de precio en el historial_precios
-- Elimina la función anterior si ya existe
DROP FUNCTION IF EXISTS fn_log_cambio_precio() CASCADE;

CREATE OR REPLACE FUNCTION fn_log_cambio_precio()
RETURNS TRIGGER AS $$
BEGIN
    -- Insertar registro con las 4 columnas restantes
    INSERT INTO historial_precios (
        id_prenda,
        precio_pasado,
        precio_nuevo,
        diferencia_precio
    )
    VALUES (
        OLD.id,
        OLD.precio_actual,
        NEW.precio_actual,
        NEW.precio_actual - OLD.precio_actual
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_historial_precios
AFTER UPDATE OF precio_actual ON prendas
FOR EACH ROW
WHEN (OLD.precio_actual IS DISTINCT FROM NEW.precio_actual)
EXECUTE FUNCTION fn_log_cambio_precio();

-- Trigger para validar el STOCK antes de una venta
-- Y para poder hacer el calculo del monto sobre un registro de venta_detalles
CREATE OR REPLACE FUNCTION fn_valida_stock_y_calcula_monto()
RETURNS TRIGGER AS $$
DECLARE
    v_stock INT;
BEGIN
    SELECT stock INTO v_stock
    FROM inventario
    WHERE id_prenda = NEW.id_prenda
    FOR SHARE;

    IF v_stock IS NULL THEN
        RAISE EXCEPTION 'La prenda % no tiene registro de inventario', NEW.id_prenda;
    END IF;

    IF v_stock < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para la prenda % (disponible %, solicitado %)',
                        NEW.id_prenda, v_stock, NEW.cantidad;
    END IF;

    NEW.monto := NEW.precio_venta * NEW.cantidad;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_before_venta_detalle
BEFORE INSERT ON venta_detalles
FOR EACH ROW
EXECUTE FUNCTION fn_valida_stock_y_calcula_monto();

-- Despues de un INSERT en venta detalles, se actualiza el stock 
-- y se registra el cambio en el historial de stock
CREATE OR REPLACE FUNCTION fn_descuenta_stock_e_historial()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_before INT;
    v_stock_after  INT;
    v_tipo_venta   INT;
BEGIN
    UPDATE inventario
    SET stock = stock - NEW.cantidad
    WHERE id_prenda = NEW.id_prenda
    RETURNING stock + NEW.cantidad, stock
    INTO v_stock_before, v_stock_after;

    SELECT id INTO v_tipo_venta
    FROM tipos_cambio_stock
    WHERE tipo = 'VENTA';

    INSERT INTO historial_stock(
        id_prenda,
        id_tipo_cambio,
        stock_pasado,
        stock_nuevo,
        diferencia_stock
    )
    VALUES (
        NEW.id_prenda,
        v_tipo_venta,
        v_stock_before,
        v_stock_after,
        -NEW.cantidad
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_venta_detalle
AFTER INSERT ON venta_detalles
FOR EACH ROW
EXECUTE FUNCTION fn_descuenta_stock_e_historial();

-- ///////////////////////////////////////////////////////////////
    

