import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { FilePickerComponent } from '@/components/ui/file-picker.component';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';

interface DocumentVersion {
  readonly version: string;
  readonly uploadedBy: string;
  readonly uploadedAt: string;
}

interface DocumentItem {
  readonly id: string;
  readonly fileName: string;
  readonly status: 'Draft' | 'In Review' | 'Ready' | 'Sent';
  readonly previewType: 'pdf' | 'docx' | 'image';
  readonly previewText: string;
  readonly versions: ReadonlyArray<DocumentVersion>;
}

@Component({
  selector: 'app-documents-library',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    FilePickerComponent,
    StatusBadgeComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <header class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">Document Library</h1>
          <p class="text-sm text-muted-foreground">
            Upload documents, preview current versions, review history, and send contracts for signing.
          </p>
        </header>

        <section class="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
          <ui-card>
            <ui-card-header>
              <ui-card-title>Upload Document</ui-card-title>
              <ui-card-description>
                Attach client contracts and supporting files.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <form class="space-y-4" [formGroup]="uploadForm" (ngSubmit)="onUpload()">
                <ui-file-picker
                  formControlName="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                />
                <ui-button type="submit" label="Upload" />
              </form>
            </ui-card-content>
          </ui-card>

          <ui-card>
            <ui-card-header>
              <ui-card-title>Document List</ui-card-title>
              <ui-card-description>
                Select a document to preview details and version timeline.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <div class="space-y-2">
                @for (document of documents(); track document.id) {
                  <button
                    type="button"
                    class="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                    [class.border-primary]="selectedDocumentId() === document.id"
                    (click)="selectDocument(document.id)"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-sm font-medium">{{ document.fileName }}</p>
                      <ui-status-badge [status]="document.status" />
                    </div>
                  </button>
                }
              </div>
            </ui-card-content>
          </ui-card>
        </section>

        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ui-card>
            <ui-card-header>
              <ui-card-title>Preview</ui-card-title>
              <ui-card-description>
                Snapshot view of the currently selected document.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              @if (selectedDocument() !== null) {
                <div class="rounded-lg border bg-muted/20 p-4">
                  <p class="text-xs uppercase text-muted-foreground">
                    {{ selectedDocument()!.previewType }} preview
                  </p>
                  <p class="mt-2 text-sm">{{ selectedDocument()!.previewText }}</p>
                </div>
              } @else {
                <p class="text-sm text-muted-foreground">Select a document to preview.</p>
              }
            </ui-card-content>
          </ui-card>

          <ui-card>
            <ui-card-header>
              <ui-card-title>Version History</ui-card-title>
              <ui-card-description>
                Full version timeline with upload attribution.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              @if (selectedDocument() !== null) {
                <ul class="space-y-2">
                  @for (version of selectedDocument()!.versions; track version.version) {
                    <li class="rounded-lg border p-3 text-sm">
                      <p class="font-medium">Version {{ version.version }}</p>
                      <p class="text-muted-foreground">
                        {{ version.uploadedBy }} - {{ version.uploadedAt }}
                      </p>
                    </li>
                  }
                </ul>
              } @else {
                <p class="text-sm text-muted-foreground">No version history available.</p>
              }
            </ui-card-content>
          </ui-card>
        </section>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Contract Signing</ui-card-title>
            <ui-card-description>
              Send the selected contract to the client for electronic signature.
            </ui-card-description>
          </ui-card-header>
          <ui-card-content>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-sm text-muted-foreground">
                Selected:
                <span class="font-medium">
                  {{ selectedDocument()?.fileName ?? 'None' }}
                </span>
              </p>
              <ui-button
                label="Send Contract for Signing"
                [disabled]="selectedDocument() === null"
                (clicked)="onSendForSigning()"
              />
            </div>
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class DocumentsLibraryComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastNotificationService);

  protected readonly uploadForm = this.formBuilder.nonNullable.group({
    file: [null as File | null, [Validators.required]],
  });

  private readonly initialDocuments: ReadonlyArray<DocumentItem> = [
    {
      id: 'doc-001',
      fileName: 'Master Services Agreement.pdf',
      status: 'Ready',
      previewType: 'pdf',
      previewText:
        'Master Services Agreement between ClientPortal and Contoso Architects covering support and implementation scope.',
      versions: [
        { version: '3.0', uploadedBy: 'Amina S.', uploadedAt: '2026-05-01 14:20' },
        { version: '2.0', uploadedBy: 'Kai N.', uploadedAt: '2026-04-28 09:45' },
      ],
    },
    {
      id: 'doc-002',
      fileName: 'Statement of Work.docx',
      status: 'In Review',
      previewType: 'docx',
      previewText:
        'Statement of Work outlines phased delivery milestones, acceptance criteria, and resource allocations.',
      versions: [
        { version: '2.1', uploadedBy: 'Lerato M.', uploadedAt: '2026-04-30 16:10' },
        { version: '2.0', uploadedBy: 'Lerato M.', uploadedAt: '2026-04-27 10:22' },
      ],
    },
    {
      id: 'doc-003',
      fileName: 'Architecture-Diagram.png',
      status: 'Draft',
      previewType: 'image',
      previewText:
        'Architecture overview showing API gateway, identity provider integration, and tenant-isolated services.',
      versions: [{ version: '1.0', uploadedBy: 'Jonas T.', uploadedAt: '2026-04-29 13:08' }],
    },
  ];

  protected readonly documents = signal<ReadonlyArray<DocumentItem>>(this.initialDocuments);
  protected readonly selectedDocumentId = signal<string>('doc-001');

  protected readonly selectedDocument = computed(
    () => this.documents().find((document) => document.id === this.selectedDocumentId()) ?? null,
  );

  protected selectDocument(documentId: string): void {
    this.selectedDocumentId.set(documentId);
  }

  protected onUpload(): void {
    if (this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      return;
    }

    const file = this.uploadForm.controls.file.value;
    if (file === null) {
      return;
    }

    const newDocument: DocumentItem = {
      id: `doc-${Date.now()}`,
      fileName: file.name,
      status: 'Draft',
      previewType: this.resolvePreviewType(file.name),
      previewText: `Uploaded file ${file.name} is ready for preview processing.`,
      versions: [
        {
          version: '1.0',
          uploadedBy: 'Current User',
          uploadedAt: new Date().toLocaleString(),
        },
      ],
    };

    this.documents.update((current) => [newDocument, ...current]);
    this.selectedDocumentId.set(newDocument.id);
    this.uploadForm.reset({ file: null });
    this.toast.success('Document uploaded successfully.');
  }

  protected onSendForSigning(): void {
    const selected = this.selectedDocument();
    if (selected === null) {
      return;
    }

    this.documents.update((current) =>
      current.map((document) =>
        document.id === selected.id
          ? {
              ...document,
              status: 'Sent',
            }
          : document,
      ),
    );

    this.toast.success(`Contract "${selected.fileName}" sent for signing.`);
  }

  private resolvePreviewType(fileName: string): DocumentItem['previewType'] {
    const normalizedName = fileName.toLowerCase();
    if (normalizedName.endsWith('.pdf')) {
      return 'pdf';
    }

    if (
      normalizedName.endsWith('.png') ||
      normalizedName.endsWith('.jpg') ||
      normalizedName.endsWith('.jpeg')
    ) {
      return 'image';
    }

    return 'docx';
  }
}
