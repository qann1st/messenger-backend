import type { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';
import type { SentMessageInfo } from 'nodemailer/lib/smtp-transport';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransporterService {
  transporter: Transporter<SentMessageInfo>;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.mail.ru',
      port: 587,
      secure: false,
      auth: {
        user: 'support@elysium.su',
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  sendMail({
    html,
    subject,
    to,
  }: {
    html: string;
    subject: string;
    to: string;
  }) {
    this.transporter.sendMail(
      {
        from: 'Elysium Support <support@elysium.su>',
        to,
        subject,
        html,
      },
      (error) => {
        if (error) {
          Logger.error(error);
        }
      },
    );
  }
}
