import { Navigate, useParams } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";

export default function WorkspacePageRedirect() {
	const { workspaceId } = useParams<{ workspaceId: string }>();
	const { pages } = useAppData();

	if (!workspaceId) {
		return <Navigate to="/app" replace />;
	}

	const firstPage = pages.find(page => page.workspaceId === workspaceId) ?? pages[0];

	if (!firstPage) {
		return <Navigate to="/app" replace />;
	}

	return <Navigate to={`/app/${workspaceId}/${firstPage.id}`} replace />;
}










