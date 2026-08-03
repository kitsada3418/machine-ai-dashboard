import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return service information', () => {
      const info = appController.getInfo();
      expect(info.name).toBe('Smart Factory API');
      expect(info.status).toBe('running');
      expect(info.docs).toBe('/api/docs');
    });
  });
});
