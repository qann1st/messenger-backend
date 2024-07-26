import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CallHandler, Injectable, NestInterceptor } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common/exceptions';

@Injectable()
export class NullInterceptor implements NestInterceptor {
  constructor(private name: string) {}

  intercept(_, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((value) => {
        if (value === null)
          throw new NotFoundException(`${this.name} not found`);
        return value;
      }),
    );
  }
}
