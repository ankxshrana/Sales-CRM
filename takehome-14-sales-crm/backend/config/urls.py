from django.contrib import admin
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect
from django.urls import include, path


def root_view(request):
    if "text/html" in request.META.get("HTTP_ACCEPT", ""):
        # If user visits in browser, provide link and auto-redirect to React frontend
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sales CRM Backend API</title>
            <meta http-equiv="refresh" content="2;url=http://localhost:5173/" />
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; max-width: 500px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
                h1 { color: #818cf8; margin-top: 0; font-size: 1.5rem; }
                p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
                a.btn { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #4f46e5; color: white; text-decoration: none; border-radius: 0.5rem; font-weight: 600; transition: background 0.2s; }
                a.btn:hover { background: #4338ca; }
                .badge { display: inline-block; background: #064e3b; color: #34d399; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold; margin-bottom: 1rem; }
            </style>
        </head>
        <body>
            <div class="card">
                <span class="badge">API ONLINE (Port 8000)</span>
                <h1>Sales CRM API Backend</h1>
                <p>You have accessed the Django REST API server at <code>http://127.0.0.1:8000/</code>.</p>
                <p>The interactive web UI runs on port <strong>5173</strong>.</p>
                <a class="btn" href="http://localhost:5173/">Go to Sales CRM Web App (Port 5173) &rarr;</a>
                <p style="font-size: 0.8rem; margin-top: 1rem; color: #64748b;">Redirecting automatically in 2 seconds...</p>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html_content)

    return JsonResponse(
        {
            "name": "Sales CRM API",
            "version": "1.0.0",
            "status": "online",
            "frontend_url": "http://localhost:5173",
            "api_root": "/api/v1/",
            "endpoints": {
                "auth": "/api/v1/auth/",
                "dashboard": "/api/v1/dashboard/",
                "deals": "/api/v1/deals/",
                "companies": "/api/v1/companies/",
                "alerts": "/api/v1/alerts/",
            },
        }
    )


api_v1_patterns = [
    path("auth/", include("apps.accounts.urls")),
    path("companies/", include("apps.companies.urls")),
    path("deals/", include("apps.deals.urls")),
    path("dashboard/", include("apps.dashboard.urls")),
    path("alerts/", include("apps.alerts.urls")),
]

urlpatterns = [
    path("", root_view, name="api-root"),
    path("admin/", admin.site.urls),
    path("api/v1/", include((api_v1_patterns, "api-v1"))),
]

