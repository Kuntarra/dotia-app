import { LegalShell } from '../_components/legal-shell'

export const metadata = { title: 'Política de privacidad · dotia' }

export default function PrivacidadPage() {
  return (
    <LegalShell title="Política de privacidad" updated="Junio 2026">
      <p>
        En <strong>ANVI Spa</strong>, responsable de la plataforma dotia, tratamos los datos personales con la diligencia que exige la
        Ley N° 19.628 sobre Protección de la Vida Privada. Esta política explica qué datos manejamos,
        con qué finalidad y cómo los protegemos.
      </p>

      <h2>1. Datos que tratamos</h2>
      <ul>
        <li><strong>De usuarios:</strong> nombre, correo corporativo y rol dentro de la Plataforma.</li>
        <li><strong>De huéspedes:</strong> nombre, RUT, teléfono y datos de la estadía (propiedad, habitación, fechas, turno).</li>
        <li><strong>De empresas clientes:</strong> razón social y antecedentes de contacto.</li>
      </ul>

      <h2>2. Finalidad</h2>
      <p>
        Los datos se utilizan exclusivamente para prestar el servicio de trazabilidad de personal en faena:
        registrar estadías, generar reportes de ocupación, coordinar la atención y dar continuidad
        operativa a la dotación de cada empresa.
      </p>

      <h2>3. Acceso y confidencialidad</h2>
      <p>
        El acceso a la información está segmentado por rol: cada usuario solo visualiza los datos de las
        propiedades o empresas que le corresponden. La información no se vende ni se cede a terceros con
        fines comerciales.
      </p>

      <h2>4. Seguridad</h2>
      <p>
        Empleamos cifrado en tránsito (HTTPS), autenticación por credenciales y controles de acceso a
        nivel de base de datos. Aun así, ningún sistema es completamente infalible; ante cualquier
        incidente relevante, notificaremos a los titulares afectados.
      </p>

      <h2>5. Conservación</h2>
      <p>
        Los datos de estadías se conservan mientras exista relación contractual con la empresa cliente y
        durante el plazo necesario para cumplir obligaciones legales o de respaldo operativo.
      </p>

      <h2>6. Derechos del titular</h2>
      <p>
        Toda persona puede solicitar acceso, rectificación o eliminación de sus datos escribiendo a{' '}
        <strong>contacto@dotia.cl</strong>. Atenderemos la solicitud en los plazos que establece la ley.
      </p>
    </LegalShell>
  )
}
