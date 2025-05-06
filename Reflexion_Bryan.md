# Reflexión Individual - Bryan

---

### 1. ¿Qué criteriors usaron para decidir qué entidades y relaciones debían formar parte del modelo?

Fuimos analizando detalladamente lo que se necesita para una tienda de ropa, lo primero que hicimos fue identificar una tienda que tuviera variedad, nos decidimos por Zara, y ya ahí fuimos tomando puntos sobre qué información era la más importante o necesaria en una tienda de ropa.

Además, teniendo en mente que la meta era llevar control de inventario y de un sistema de ventas, primero, establecimos toda la información que se debía tener sobre una prenda, como su categoría, rango de edad, género, y marca. Tras definir esto, para tener trazabilidad, se definió una entidad de inventario, pero junto con esta se planteó el poder integrar una entidad de historial de cambios de precio, y otra de cambios de stock. Tras tener esto establecido, nos movimos a la parte de ventas, aquí primero pensamos en qué información se necesitaba del cliente, y apartir de esto surgió la idea de tener cliente_correos, cliente_telefonos y cliente_direcciones como tablas de cruce para garantizar qeu un mismo cliente pudiera tener varios teléfonos, correos, y direcciones dentro de nuestro esquema. Por último, establecimos que para llevar un buen control de las ventas debíamos tener una entidad de ventas con la información general de una venta, y otra entidad venta_detalles para poder desglosar en varios registros qué es lo que se consumió en la compra, cantidad de un producto, el precio de venta de este y el monto que se canceló.

---

### 2. ¿Qué tan adecuadas fueron las claves primarias y foráneas que definieron en su diseño?

En todas las tablas se establecieron claves primarias, y en base a las relaciones planteadas entre las entidades se buscó que en el diagrama ER se viera reflejadas la presencia de claves foráneas y las tablas que se conectaban, ya en el script ddl, se buscó que estas llaves foráneas se representaran. En cuanto a si se facilitó la consulta, en algunos casos probablemente no, pues terminamos con un montón de JOINs, pero se cuido la integridad de los datos.

---

### 3. ¿En qué medida aplicaron la normalización? Qué beneficios y limitaciones experimentaron?

Con cada tabla que se realizaba procuramos que fuera correctamente escalable, como con la creación de las entidades de cliente_direcciones, cliente_telefonos, o cliente_direcciones. Además, siempre se buscó que no hubieran dependencias transitivas, de ser así se creaba otra tabla para representar correctamente las relaciones. Esto nos permitió que bajo el diseño planteado se facilitara el desglose de los datos, como en el caso de los detalles de las ventas, que se tuviera un manejo correcto de datos multivaluados. Personalemnte, considero que no se presnetó alguna situación en la que se tuviera que decidir entre rendimiento y diseño teórico.

---

### 4. ¿Qué restricciones y reglas del negocio implementaron directamente en la base de datos y por qué?

En toods los datos relevantes para las consultas se les colocó not null, en aquellos atributos en donde se representaban montos de dinero o de stock se colocó un check que validara que fuera mayor a cero, solamente en el precio de venta se dejó que el check validara que fuera mayor o igual a cero por si por alguna razón alguna prenda se llegara a regalar. Además, para llevar un buen control, en ventas y en las entidades que servían para llevar hisotirales se dejó por default el uso del current timestamp para los atributos que representaban la fecha en que se insertó el registro, y en tablas como la de marcas, género, categoría, entre otras, se dejó como unique los campos de nombres para evitar inconsistencias, y tener dos marcas iguales por ejemplo. Por otro lado, en el caso de los triggers, se implementó un trigger after update para cuando se actualizara el precio actual de una prenda, para que insertara en la entidad de historial de precios el cambio que se había dado sobre la prenda, se utilizó un trigger before insert en la tabal de venta_detalles para validar si había stock suficiente y que el campo de monto se pudiera calcular en base al precio de venta y cantidad de productos, y por último, se colocó un trigger after insert, para que cuando se insertara un registor en la entidad de venta_detalles, se actualizara también el stock disponible de la prenda que se mostraba en la entidad de inventario.

---

### 5. ¿Qué ventajas y desventajeas identificas del modelo que construyeron al moemnto de hacer consultas complejas?

Considero que el modelo es flexible y escalable, pues del lado del frontend se dejó de tal forma que la tabla iba a mostrar una cantidad de columnas acorde a lo que devolviera el query que se definió en el endpoint; además, en los endpoints se dejó de tal forma para que lso reportes se pudieran generar aunque no se colocara ningún filtro. No obstante, hablando específicamente de las consultas, algunos queries fueron un poco complejos de plantear debido a la cantidad de JOINs que se tenían que hacer, entonces se tuvo que tener cuidado con lo qeu se colocaba en el GROUP BY, y dependiendo del endpoint, validar que se colocarán adecuadamente las condiciones que iban en el WHERE y las que se tenían que colocar con HAVING.

---

### 6. ¿Qué cambiarían en el diseño de la base de datos si tuvieran que escalar este sistema a un entorno de producción?

Probablemente invertiría más tiempo en la trazabilidad, buscando que en cada acción relevante o sensible que se haga quedé guardado la información de la persona que realizó el cambio, como en un atributo updated_by, por ejemplo, si alguien aumentó o disminuyó el stock de un producto, que pueda registrarse quién ha sido. Asimismo, se podrían identificar store procedures y views a implementar para que las consultas fueran más sencillas.

---
