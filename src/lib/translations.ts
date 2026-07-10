export interface AppTranslations {
  appName: string;
  appSubtitle: string;
  navMenu: string;
  navMyOrders: string;
  navKitchen: string;
  navQr: string;
  navAdmin: string;
  
  heroBadge: string;
  heroTitleFirst: string;
  heroTitleSecond: string;
  heroDescription: string;
  heroTaglineSabor: string;
  heroTaglineSaborVal: string;
  heroTaglineVinculo: string;
  heroTaglineVinculoVal: string;
  
  searchPlaceholder: string;
  allCategories: string;
  secCafe: string;
  secBuffet: string;
  
  priceLabel: string;
  detailsBtn: string;
  addBtn: string;
  noDishesFound: string;
  noDishesDesc: string;
  showAllMenu: string;
  
  cartTitle: string;
  cartClose: string;
  cartEmpty: string;
  cartEmptyDesc: string;
  cartViewDishes: string;
  cartSelectedDishes: string;
  cartMesaDelivery: string;
  cartMesaLabel: string;
  cartMesaSelect: string;
  cartMesaLinked: string;
  cartWhoPicksUp: string;
  cartWhoPlaceholder: string;
  cartPhone: string;
  cartPhonePlaceholder: string;
  cartPhoneHint: string;
  cartPayMethod: string;
  cartPayCard: string;
  cartPayMobile: string;
  cartPayCash: string;
  cartSubtotal: string;
  cartTotal: string;
  cartSolidarityNote: string;
  cartCheckoutCard: string;
  cartCheckoutCash: string;
  
  payTitle: string;
  paySandbox: string;
  payProcessing: string;
  payProcessingDesc: string;
  payCompleted: string;
  payCompletedDesc: string;
  payApproved: string;
  payDebitedTotal: string;
  payCardNumber: string;
  payCardHolder: string;
  payCardExpiry: string;
  payCardCvv: string;
  payWalletNumber: string;
  payCancel: string;
  paySubmit: string;
  
  ordersTitle: string;
  ordersSubtitle: string;
  ordersEmpty: string;
  ordersEmptyDesc: string;
  ordersEmptyBtn: string;
  ordersTicket: string;
  ordersTotalPaid: string;
  ordersProgresso: string;
  ordersReceived: string;
  ordersPreparing: string;
  ordersReady: string;
  ordersDelivered: string;
  ordersPickupAlertTitle: string;
  ordersPickupAlertDesc: string;
  ordersPickupAlertBadge: string;
  ordersCashPendingTitle: string;
  ordersCashPendingDesc: string;
  
  tableLinkedTitle: string;
  tableLinkedDesc: string;
  tableNotLinkedTitle: string;
  tableNotLinkedDesc: string;
}

export const TRANSLATIONS: Record<'es' | 'en', AppTranslations> = {
  es: {
    appName: "Buffet Casa de Dios",
    appSubtitle: "Buffet y Cafetería Gourmet",
    navMenu: "Carta",
    navMyOrders: "Mis Pedidos",
    navKitchen: "Cocina",
    navQr: "Imprimir QRs",
    navAdmin: "Admin",
    
    heroBadge: "Exquisitez y frescura en cada plato",
    heroTitleFirst: "Disfruta de un buffet gourmet ",
    heroTitleSecond: "preparado al instante",
    heroDescription: "Bienvenido al Buffet Casa de Dios. Disfrute de nuestra selecta carta de cafetería de especialidad, snacks crujientes y platos buffet tradicionales preparados con ingredientes frescos de la más alta calidad y un servicio inigualable.",
    heroTaglineSabor: "Sabor",
    heroTaglineSaborVal: "Argentino y del Mundo",
    heroTaglineVinculo: "Vínculo",
    heroTaglineVinculoVal: "Pedido por Mesa / QR",
    
    searchPlaceholder: "Buscar por plato o ingrediente...",
    allCategories: "Todos",
    secCafe: "Sección Café & Snacks",
    secBuffet: "Sección Buffet",
    
    priceLabel: "Precio",
    detailsBtn: "Detalles",
    addBtn: "Agregar al Pedido",
    noDishesFound: "No se encontraron platos",
    noDishesDesc: "No encontramos platos que coincidan con la búsqueda. Intente de nuevo con otros términos o consulte con nuestro asistente IA.",
    showAllMenu: "Mostrar Todo el Menú",
    
    cartTitle: "Mi Carrito de Pedido",
    cartClose: "Cerrar",
    cartEmpty: "Su carrito está vacío",
    cartEmptyDesc: "Explore nuestra carta interactiva y agregue deliciosos platos tradicionales.",
    cartViewDishes: "Ver Platos",
    cartSelectedDishes: "Platos Seleccionados",
    cartMesaDelivery: "Datos de Mesa y Entrega",
    cartMesaLabel: "Número de Mesa",
    cartMesaSelect: "-- Selecciona tu Mesa --",
    cartMesaLinked: "Mesa {num} (Vinculada por QR)",
    cartWhoPicksUp: "¿Quién retira? (Tu Nombre)",
    cartWhoPlaceholder: "Ej. Juan Pérez",
    cartPhone: "Teléfono Móvil (Opcional)",
    cartPhonePlaceholder: "Ej. +54 9 11 5555-5555",
    cartPhoneHint: "Te enviaremos avisos si tienes habilitado el sistema.",
    cartPayMethod: "Método de Pago",
    cartPayCard: "Tarjeta (Simulado)",
    cartPayMobile: "Pago Móvil (Simulado)",
    cartPayCash: "Pagar en Caja",
    cartSubtotal: "Subtotal comanda",
    cartTotal: "Total a Pagar",
    cartSolidarityNote: "¡Gracias por su preferencia! Su pedido está siendo procesado con la mayor dedicación por nuestro personal de cocina.",
    cartCheckoutCard: "Proceder al Pago Integrado (Simulado)",
    cartCheckoutCash: "Confirmar Pedido (Pagar en Caja)",
    
    payTitle: "Pasarela de Pago Segura",
    paySandbox: "Sandbox Simulado",
    payProcessing: "Procesando Transacción...",
    payProcessingDesc: "Conectando con el procesador de pagos bancario. Por favor no cierre esta ventana.",
    payCompleted: "¡Pago Autorizado Exitosamente!",
    payCompletedDesc: "Se ha debitado el total y enviado la comanda al instante a la cocina.",
    payApproved: "Transacción aprobada",
    payDebitedTotal: "Total a debitar",
    payCardNumber: "Número de Tarjeta",
    payCardHolder: "Nombre en Tarjeta",
    payCardExpiry: "Expiración",
    payCardCvv: "CVV (Código)",
    payWalletNumber: "Número de Teléfono Vinculado",
    payCancel: "Cancelar",
    paySubmit: "Pagar",
    
    ordersTitle: "Mis Pedidos en Curso",
    ordersSubtitle: "Siga el estado de preparación de sus platos en tiempo real directamente desde la cocina.",
    ordersEmpty: "Aún no tienes pedidos",
    ordersEmptyDesc: "Cuando realices tu pedido de buffet, aparecerá aquí el ticket de comanda para que puedas monitorear su estado en tiempo real.",
    ordersEmptyBtn: "Ver la Carta Interactiva",
    ordersTicket: "Comanda",
    ordersTotalPaid: "Total pagado",
    ordersProgresso: "Progreso de Entrega:",
    ordersReceived: "Espera en cola",
    ordersPreparing: "En preparación / cocina",
    ordersReady: "¡LISTO PARA RETIRAR!",
    ordersDelivered: "Entregado",
    ordersPickupAlertTitle: "¡TU PLATO ESTÁ LISTO EN LA BARRA!",
    ordersPickupAlertDesc: "Por favor, acérquese a la barra de buffet del salón, mencione su número de mesa y retire sus platos calientes para disfrutar.",
    ordersPickupAlertBadge: "Presentar ticket",
    ordersCashPendingTitle: "Pago en Caja pendiente:",
    ordersCashPendingDesc: "Elegiste pagar físicamente. Por favor acércate a la caja principal del buffet, proporciona tu código para abonar tu comanda y que la cocina inicie de inmediato.",
    
    tableLinkedTitle: "Tu Mesa",
    tableLinkedDesc: "MESA {num}",
    tableNotLinkedTitle: "Mesa",
    tableNotLinkedDesc: "No Vinculada"
  },
  en: {
    appName: "Buffet Casa de Dios",
    appSubtitle: "Gourmet Buffet & Cafeteria",
    navMenu: "Menu",
    navMyOrders: "My Orders",
    navKitchen: "Kitchen",
    navQr: "Print QRs",
    navAdmin: "Admin",
    
    heroBadge: "Exquisite flavors in every dish",
    heroTitleFirst: "Enjoy a delicious gourmet buffet ",
    heroTitleSecond: "prepared fresh for you",
    heroDescription: "Welcome to Buffet Casa de Dios. Enjoy our select menu of specialty coffee, crispy snacks, and traditional buffet dishes prepared with the highest quality fresh ingredients and unparalleled service.",
    heroTaglineSabor: "Flavor",
    heroTaglineSaborVal: "Argentine and International",
    heroTaglineVinculo: "Link",
    heroTaglineVinculoVal: "Order by Table / QR",
    
    searchPlaceholder: "Search by dish or ingredient...",
    allCategories: "All",
    secCafe: "Coffee & Snacks Section",
    secBuffet: "Buffet Section",
    
    priceLabel: "Price",
    detailsBtn: "Details",
    addBtn: "Add to Order",
    noDishesFound: "No dishes found",
    noDishesDesc: "We could not find dishes matching your search. Please try again with other terms or consult our AI assistant.",
    showAllMenu: "Show Full Menu",
    
    cartTitle: "My Order Cart",
    cartClose: "Close",
    cartEmpty: "Your cart is empty",
    cartEmptyDesc: "Explore our interactive menu and add delicious traditional dishes.",
    cartViewDishes: "View Dishes",
    cartSelectedDishes: "Selected Dishes",
    cartMesaDelivery: "Table and Delivery Details",
    cartMesaLabel: "Table Number",
    cartMesaSelect: "-- Select your Table --",
    cartMesaLinked: "Table {num} (Linked by QR)",
    cartWhoPicksUp: "Who Picks Up? (Your Name)",
    cartWhoPlaceholder: "e.g. John Doe",
    cartPhone: "Mobile Phone (Optional)",
    cartPhonePlaceholder: "e.g. +54 9 11 5555-5555",
    cartPhoneHint: "We will send you alerts if the notification system is enabled.",
    cartPayMethod: "Payment Method",
    cartPayCard: "Card (Simulated)",
    cartPayMobile: "Mobile Pay (Simulated)",
    cartPayCash: "Pay at Cashier",
    cartSubtotal: "Order subtotal",
    cartTotal: "Total to Pay",
    cartSolidarityNote: "Thank you for your preference! Your order is being processed with the utmost dedication by our kitchen staff.",
    cartCheckoutCard: "Proceed to Integrated Payment (Simulated)",
    cartCheckoutCash: "Confirm Order (Pay at Cashier)",
    
    payTitle: "Secure Payment Gateway",
    paySandbox: "Simulated Sandbox",
    payProcessing: "Processing Transaction...",
    payProcessingDesc: "Connecting to the bank payment processor. Please do not close this window.",
    payCompleted: "Payment Authorized Successfully!",
    payCompletedDesc: "The total has been debited and the order sent immediately to the kitchen.",
    payApproved: "Transaction approved",
    payDebitedTotal: "Total to debit",
    payCardNumber: "Card Number",
    payCardHolder: "Name on Card",
    payCardExpiry: "Expiration",
    payCardCvv: "CVV (Code)",
    payWalletNumber: "Linked Phone Number",
    payCancel: "Cancel",
    paySubmit: "Pay",
    
    ordersTitle: "My Active Orders",
    ordersSubtitle: "Follow the preparation status of your dishes in real time directly from the kitchen.",
    ordersEmpty: "You don't have any orders yet",
    ordersEmptyDesc: "When you place your buffet order, your ticket will appear here to monitor its status in real time.",
    ordersEmptyBtn: "View Interactive Menu",
    ordersTicket: "Order Ticket",
    ordersTotalPaid: "Total paid",
    ordersProgresso: "Delivery Progress:",
    ordersReceived: "Queued",
    ordersPreparing: "In kitchen / preparation",
    ordersReady: "READY TO PICK UP!",
    ordersDelivered: "Delivered",
    ordersPickupAlertTitle: "YOUR DISH IS READY AT THE BAR!",
    ordersPickupAlertDesc: "Please come to the buffet counter, state your table number, and retrieve your warm dishes to enjoy.",
    ordersPickupAlertBadge: "Present ticket",
    ordersCashPendingTitle: "Pending Cashier Payment:",
    ordersCashPendingDesc: "You chose to pay physically. Please head to the main cashier, provide your code to pay for your order, and the kitchen will begin immediately.",
    
    tableLinkedTitle: "Your Table",
    tableLinkedDesc: "TABLE {num}",
    tableNotLinkedTitle: "Table",
    tableNotLinkedDesc: "Not Linked"
  }
};
