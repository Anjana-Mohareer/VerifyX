import Sidebar from './Sidebar';
export default function Shell({children,type}){return <div className="app-shell"><Sidebar type={type}/><main className="main-panel">{children}</main></div>}
