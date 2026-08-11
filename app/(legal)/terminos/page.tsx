import { LegalShell } from '../_components/legal-shell'

export const metadata = { title: 'Términos de servicio · dotia' }

export default function TerminosPage() {
  return (
    <LegalShell title="Términos de servicio" updated="Junio 2026">
      <p>
        Estos términos regulan el acceso y uso de la plataforma de trazabilidad de personal en faena
        <strong> dotia</strong>, operada por <strong>ANVI Spa</strong> (en adelante, la “Plataforma”). Al ingresar con tus credenciales
        corporativas, aceptas las condiciones descritas a continuación.
      </p>

      <h2>1. Acceso y cuentas</h2>
      <p>
        El acceso es nominativo y está restringido a usuarios autorizados por su empresa o por ANVI Spa.
        Cada usuario es responsable de la confidencialidad de sus credenciales y de toda actividad
        realizada bajo su cuenta. Las cuentas no son transferibles.
      </p>

      <h2>2. Uso permitido</h2>
      <ul>
        <li>Gestionar check-in, check-out y estadías de la dotación a tu cargo.</li>
        <li>Consultar reportes y ocupación de las propiedades asignadas.</li>
        <li>Administrar usuarios, clientes y propiedades, según el rol otorgado.</li>
      </ul>
      <p>
        Queda prohibido el uso de la Plataforma para fines distintos a la gestión de la dotación en faena, el
        acceso no autorizado a datos de terceros, o cualquier acción que comprometa la seguridad del servicio.
      </p>

      <h2>3. Disponibilidad del servicio</h2>
      <p>
        ANVI Spa procura mantener la Plataforma disponible de forma continua, pero puede realizar tareas
        de mantenimiento o actualización que interrumpan temporalmente el servicio. No garantizamos
        disponibilidad ininterrumpida ni ausencia total de errores.
      </p>

      <h2>4. Datos y responsabilidad</h2>
      <p>
        La información registrada (huéspedes, empresas, estadías) es propiedad de su titular y se trata
        conforme a nuestra <strong>Política de privacidad</strong>. El usuario es responsable de la
        veracidad y actualización de los datos que ingresa.
      </p>

      <h2>5. Modificaciones</h2>
      <p>
        Estos términos pueden actualizarse para reflejar mejoras del servicio o cambios normativos.
        Las versiones vigentes se publican en esta misma página con su fecha de actualización.
      </p>

      <h2>6. Contacto</h2>
      <p>
        Ante cualquier duda sobre estos términos, escríbenos a{' '}
        <strong>contacto@dotia.cl</strong> o coordina por WhatsApp con nuestra Dirección Comercial.
      </p>
    </LegalShell>
  )
}
