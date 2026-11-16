import PageFrame from './PageFrame'
import UserMessages from '../matrimony/UserMessages'

// "Contact admin" on the dashboard: one place to ask about ANY menu
export default function EnquiryPage({ session, onBack }) {
  return (
    <PageFrame title="Contact admin" icon="✉️" onBack={onBack}>
      <div className="eg-pad"><UserMessages userId={session.user.id} topic="any" /></div>
    </PageFrame>
  )
}
