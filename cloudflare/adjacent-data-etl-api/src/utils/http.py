import json
from pyodide.ffi import to_js as _to_js
from urllib.parse import urlencode
from js import Object, fetch, Response, Headers, console

class AsyncHTTPUtils:
    @staticmethod
    def to_js(obj):
        return _to_js(obj, dict_converter=Object.fromEntries)

    @staticmethod
    async def gather_response(response):
        headers = response.headers
        content_type = headers["content-type"] or ""
        if "application/json" in content_type:
            return (content_type, await response.json())
        return (content_type, await response.text())

    def __init__(self, base_url):
        self.base_url = base_url.rstrip('/')

    async def _send_request(self, method, endpoint, data=None, params=None, headers=None, external=False):
        if params:
            query_string = urlencode(params)

            if external:
                url = f"{endpoint.lstrip('/')}?{query_string}"
            else: 
                url = f"{self.base_url}/{endpoint.lstrip('/')}?{query_string}"
        else:
            if external:
                url = f"{endpoint.lstrip('/')}"
            else:
                url = f"{self.base_url}/{endpoint.lstrip('/')}"

        options = {
            "method": method,
            "headers": headers or {},
        }

        if data is not None:
            options["body"] = data
            options["headers"]["content-type"] = "application/json;charset=UTF-8"
        response = await fetch(url, self.to_js(options))
        content_type, result = await self.gather_response(response)

        return result
        # return {
        #     "status_code": response.status,
        #     "headers": dict(response.headers),
        #     "content_type": content_type,
        #     "data": result
        # }

    async def get(self, endpoint, params=None, headers=None, external=False):
        return await self._send_request('GET', endpoint, params=params, headers=headers, external=external)

    async def post(self, endpoint, data, headers=None):
        return await self._send_request('POST', endpoint, data=data, headers=headers)

    async def delete(self, endpoint, headers=None):
        return await self._send_request('DELETE', endpoint, headers=headers)
    
    async def patch(self, endpoint, data, headers=None):
        return await self._send_request('PATCH', endpoint, data=data, headers=headers)

    @staticmethod
    def create_response(result, content_type):
        headers = Headers.new({"content-type": content_type}.items())
        return Response.new(result, headers=headers)