import http.server
import socketserver
import os
import sys

PORT = 3000
DIRECTORY = os.path.join(os.path.dirname(__file__), "mock-site")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"==================================================")
        print(f"🛒 CartGuard Test Mock Store is running at:")
        print(f"   http://localhost:{PORT}/amazon_product.html (Amazon-like Product - 0 false positives)")
        print(f"   http://localhost:{PORT}/index.html (Listing ₹499)")
        print(f"   http://localhost:{PORT}/cart.html   (Cart ₹676)")
        print(f"   http://localhost:{PORT}/payment.html (Payment ₹796)")
        print(f"==================================================")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
