# MAATWORK - Guía de Reconstrucción de la App

Este documento explica paso a paso la lógica de negocio, arquitectura y todas las funciones de la aplicación MAATWORK, pensado para poder reconstruirla desde cero. Está explicado de forma detallada pero sin entrar en el código técnico profundo, para que cualquier persona (incluso sin ser programador) pueda entender "qué hace" y "cómo funciona" cada parte del sistema.

## 1. Visión General: ¿Qué es MAATWORK?

MAATWORK es una plataforma diseñada para el **"Gestión Patrimonial Profesional" (Wealth Management)**. Es decir, es una herramienta (tipo CRM + Gestor de Portafolios) pensada para que Asesores Financieros puedan gestionar a sus clientes, hacer seguimiento de sus inversiones, organizar su trabajo diario y colaborar en equipo.

### La Estructura General (La Arquitectura Básica)
El sistema está dividido en tres grandes partes que trabajan juntas:
1.  **La Web (Frontend):** Lo que ve el usuario. Está construida con **Next.js 15** (tecnología web moderna muy rápida). Aquí es donde el asesor hace click, ve gráficos y llena formularios.
2.  **El Motor (Backend/API):** El cerebro que procesa todo. Está construido con **Express.js**. Recibe las peticiones de la web, aplica las reglas de negocio y guarda o saca información de la base de datos.
3.  **La Bóveda (Base de Datos):** Donde se guarda toda la información. Usa **PostgreSQL** (organizado mediante una herramienta llamada Drizzle).

## 2. La Lógica de Negocio: Todo lo que hace la App (Módulo por Módulo)

Si tuviéramos que rehacer la app, tendríamos que programar los siguientes grandes bloques (módulos) de funcionalidades.

### Módulo 1: Identidad y Seguridad (Usuarios y Roles)
Antes de que alguien pueda usar el sistema, debe poder entrar de forma segura.
*   **Registro e Inicio de Sesión:** Funciones clásicas de crear cuenta, entrar con email/contraseña y recuperar contraseña.
*   **Roles y Permisos:** El sistema sabe si eres un "Asesor normal" o un "Administrador". Un administrador puede ver y hacer más cosas que un asesor normal.
*   **Plan de Carrera (`Career Plan`):** El sistema tiene una forma de medir el "nivel" del asesor (por ejemplo, Junior, Senior), probablemente basado en su desempeño o el dinero que administra.
*   **Inicio de sesión con Google:** Permite a los usuarios entrar usando su cuenta de Google para mayor comodidad.

### Módulo 2: Gestión de Clientes (El CRM Core)
Esta es la herramienta principal del asesor para organizar a las personas a las que ayuda.
*   **Agenda de Contactos (`Contacts`):** Una libreta de direcciones digital muy avanzada. Se guarda nombre, email, teléfono, y estado del cliente.
*   **El Embudo de Ventas (`Pipeline`):** Es una vista (tipo tablero) que muestra en qué etapa está un cliente potencial. Ejemplo: "Recién contactado" -> "Reunión agendada" -> "Propuesta enviada" -> "Cliente activo".
*   **Etiquetas y Segmentos (`Tags & Segments`):** Permite clasificar a los clientes. Ejemplo: Ponerle etiqueta "VIP" o "Conservador". Los segmentos permiten agruparlos para buscar más rápido (ej: "Ver todos mis clientes VIP").
*   **Notas y Archivos Adjuntos (`Notes & Attachments`):** En el perfil de cada cliente, el asesor puede escribir un resumen de la última llamada (Notas) y subir PDFs de sus contratos o DNIs (Adjuntos).
*   **Tareas y Recordatorios (`Tasks`):** El asesor puede crear tareas como "Llamar a Juan el martes para revisar su cartera". Las tareas tienen estados (Pendiente, Completada), prioridades y pueden ser repetitivas (Recurrentes).

### Módulo 3: Dinero e Inversiones (Wealth Management)
Aquí es donde el CRM se vuelve específico para finanzas.
*   **Catálogo de Instrumentos (`Instruments`):** Una lista de cosas en las que se puede invertir (Acciones, Bonos, Fondos).
*   **Integración con Brokers (`Broker Integration`):** El sistema puede conectarse con las plataformas donde realmente está el dinero (Brokers) para traer información automática de qué compró o vendió el cliente y cuánto saldo tiene (`transactions` y `positions`).
*   **AUM (Assets Under Management - Activos Bajo Gestión):** Es la métrica más importante. El sistema suma todo el dinero que el asesor está manejando para sus clientes y guarda "fotos" (`snapshots`) mes a mes para ver si está creciendo.
*   **Portafolios (`Portfolios`):** El asesor crea "Carteras de Inversión". Ejemplo: "Cartera Conservadora de María". Aquí asigna porcentajes (50% en Bonos, 50% en Acciones) y monitorea cómo le va.
*   **Benchmarks:** Son puntos de referencia. Ejemplo: Comparar cómo le va al portafolio de un cliente frente a lo que hizo el dólar o el índice S&P 500.

### Módulo 4: Trabajo en Equipo (Collaboration)
Muchos asesores no trabajan solos, trabajan en grupos o agencias.
*   **Equipos (`Teams`):** Se pueden crear grupos de trabajo.
*   **Membresías (`Team Memberships`):** Sistema para invitar a asesores a un equipo, aceptar invitaciones y definir quién es el líder del equipo.
*   **Metas de Equipo (`Team Goals`):** El líder puede establecer objetivos mensuales (Ej: "Conseguir $100,000 nuevos este mes") y el sistema rastrea cómo va el equipo para lograrlo.
*   **Calendario (`Calendar`):** Un lugar centralizado para ver las reuniones del equipo.

### Módulo 5: Automatizaciones y Alertas
Para ahorrarle tiempo al asesor.
*   **Notificaciones:** El sistema avisa si una tarea está vencida, si un cliente nuevo se registró o si se cumplió una meta.
*   **Automatizaciones (`Automations`):** Reglas de tipo "Si pasa esto, haz aquello". Ejemplo: "Si un cliente pasa a la etapa 'Cliente Activo', envíale un mail de bienvenida automáticamente".
*   **Capacitaciones (`Capacitaciones`):** Un espacio donde los asesores pueden acceder a cursos o materiales de estudio para mejorar.

### Módulo 6: Reportes y Auditoría
Para medir el éxito y mantener todo seguro.
*   **Métricas y Analíticas (`Metrics` & `Analytics`):** Gráficos que muestran cuántos clientes nuevos hay, cuánto dinero ingresó y cómo va el cumplimiento de objetivos.
*   **Reportes:** Capacidad de exportar esta información.
*   **Auditoría (`Audit Logs`):** Un registro invisible que anota "Quién hizo qué y a qué hora". Muy importante en finanzas para saber si alguien borró un registro importante.

## 3. Guía Paso a Paso para Reconstruir la App desde Cero

Si fuéramos un equipo de desarrollo empezando hoy, este sería el orden de trabajo:

### FASE 1: Los Cimientos (La Base de Datos)
Lo primero es crear las "tablas" en Excel (Base de datos) para guardar todo.
1.  **Crear el servidor de Base de Datos.**
2.  **Crear tablas de Seguridad:** Tablas para `Usuarios`, `Roles`, `Equipos`.
3.  **Crear tablas del CRM:** Tablas para `Contactos`, `Estados del Pipeline`, `Etiquetas`, `Notas`, `Tareas`.
4.  **Crear tablas Financieras:** Tablas para `Instrumentos_financieros`, `Cuentas_de_Broker`, `Portafolios_de_clientes`, `AUM (Dinero gestionado)`.

### FASE 2: El Cerebro (Backend / API)
Luego, programamos las "rutas" que conectan la base de datos con el mundo exterior.
1.  **Sistema de Login:** Programar la lógica para validar contraseñas y dar un "pase de entrada" (Token de seguridad).
2.  **Rutas del CRM:** Programar funciones que permitan "Crear Cliente", "Editar Cliente", "Borrar Cliente", "Añadir Tarea".
3.  **Rutas Financieras:** Programar la lógica matemática compleja: "Sumar todo el dinero de este cliente", "Calcular el rendimiento del portafolio".
4.  **Sistema de Permisos:** Añadir candados a todas las rutas. (Ej: "Asegúrate de que este usuario solo pueda ver a SUS clientes y no los de otro asesor").

### FASE 3: Las Herramientas Visuales (Design System)
Antes de construir las pantallas finales, creamos los "ladrillos" de diseño.
1.  **Crear librería de Componentes:** Diseñar cómo se verán todos los botones, los campos de texto, las tarjetas, los menús desplegables y las ventanas emergentes. Esto asegura que toda la app se vea profesional y consistente.

### FASE 4: La Interfaz de Usuario (Frontend / Web App)
Finalmente, armamos la página web real que usará el asesor.
1.  **La Página Pública (Landing Page):** La página de inicio tipo folleto que vende el servicio ("Potencia tu patrimonio con MaatWork"), optimizada para que aparezca en Google.
2.  **Pantallas de Login/Registro.**
3.  **El Panel Principal (Dashboard):** La pantalla de inicio del asesor una vez que entra. Debe mostrar un resumen: Gráficos de dinero gestionado, progreso de metas mensuales y tareas urgentes para hoy.
4.  **Pantalla de Contactos:** Una lista o tabla con todos sus clientes. Al hacer clic en uno, se abre su "Expediente" completo (notas, tareas, dinero).
5.  **Pantalla de Pipeline (Embudo):** Un tablero visual donde el asesor pueda arrastrar tarjetitas de clientes de una etapa a otra (Ej: arrastrar de "Llamada pendiente" a "Reunión exitosa").
6.  **Pantalla de Portafolios:** Donde el asesor diseña en qué se invierte el dinero del cliente.
7.  **Pantallas de Equipo y Configuración:** Para ver cómo le va al grupo y cambiar datos personales.

### FASE 5: Magia y Pulido (Optimizaciones)
Para que la app se sienta de "clase mundial".
1.  **Conectar Automatizaciones:** Programar el código que hace que las cosas pasen solas en segundo plano.
2.  **Respuestas Inmediatas (Optimistic Updates):** Hacer que cuando el asesor marque una tarea como "Hecha", la pantalla reaccione instantáneamente sin esperar a que el servidor confirme (para que se sienta muy rápida).
3.  **Integración de Datos Reales:** Conectar (si es posible) con servicios externos como Bloomberg o APIs de Brokers para actualizar los precios de las acciones en tiempo real.
