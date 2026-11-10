# Construir desde la raíz:  docker build -f serverless/Dockerfile -t clasificaia-lambda .
FROM public.ecr.aws/lambda/python:3.12
RUN pip install --no-cache-dir "scikit-learn>=1.5" "joblib>=1.4"
COPY modelo/entrenar.py /tmp/entrenar.py
RUN python /tmp/entrenar.py ${LAMBDA_TASK_ROOT}/modelo.joblib
COPY serverless/lambda_function.py ${LAMBDA_TASK_ROOT}/
CMD ["lambda_function.lambda_handler"]
