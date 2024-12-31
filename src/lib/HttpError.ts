interface ResponseLike {
  status: number;
  statusText: string;
}

export default class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;

  constructor(response: ResponseLike) {
    super(`${response.status}: ${response.statusText}`);
    this.status = response.status;
    this.statusText = response.statusText;
  }
}
