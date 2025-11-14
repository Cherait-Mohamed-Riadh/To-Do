import { Navigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";

export default function WorkspaceRedirect() {
	const { pages, activeWorkspaceId, activePageId } = useAppData();

	if (!activeWorkspaceId) {
		return <Navigate to="/login" replace />;
	}

	const fallbackPage =
		activePageId ||
		pages.find(page => page.workspaceId === activeWorkspaceId)?.id ||
		pages[0]?.id;

	if (!fallbackPage) {
		return <Navigate to="/login" replace />;
	}

	return <Navigate to={`/app/${activeWorkspaceId}/${fallbackPage}`} replace />;
}










