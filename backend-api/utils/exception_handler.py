"""
Custom DRF Exception Handler — Standardized error response format.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """Format all API errors consistently."""
    response = exception_handler(exc, context)

    if response is not None:
        custom_response = {
            'status': 'error',
            'code': type(exc).__name__,
            'message': '',
            'errors': {},
        }

        if isinstance(response.data, dict):
            # Handle DRF validation errors
            if 'detail' in response.data:
                custom_response['message'] = str(response.data['detail'])
            else:
                custom_response['message'] = 'Dữ liệu không hợp lệ.'
                custom_response['errors'] = response.data
        elif isinstance(response.data, list):
            custom_response['message'] = '; '.join(str(e) for e in response.data)
        else:
            custom_response['message'] = str(response.data)

        response.data = custom_response

    return response
