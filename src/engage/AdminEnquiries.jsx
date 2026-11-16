import PageFrame from './PageFrame'
import { GeneralMessages } from '../matrimony/AdminInbox'

// admin: all enquiries from every menu, with a topic filter
export default function AdminEnquiries({ onBack }) {
  return (
    <PageFrame title="Enquiries" icon="📥" onBack={onBack}>
      <div className="eg-pad"><GeneralMessages /></div>
    </PageFrame>
  )
}
