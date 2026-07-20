import locale from '@angular/common/locales/ru';
import { NgModule } from '@angular/core';
import { MonacoEditorModule } from '@materia-ui/ngx-monaco-editor';
import { ConfirmationService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ContextMenuModule } from 'primeng/contextmenu';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { FieldsetModule } from 'primeng/fieldset';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/inputtextarea';
import { MenuModule } from 'primeng/menu';
import { PaginatorModule } from 'primeng/paginator';
import { PanelModule } from 'primeng/panel';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { AccordionModule } from 'primeng/accordion';
import { TooltipModule } from 'primeng/tooltip';
import { TreeTableModule } from 'primeng/treetable';
import { DataViewModule } from 'primeng/dataview';
import { FileUploadModule } from 'primeng/fileupload';
import { ListboxModule } from 'primeng/listbox';
import { TableModule } from 'primeng/table';
import { DynamicDialog } from 'primeng/dynamicdialog';
import { SidebarModule } from 'primeng/sidebar';
import { TriStateCheckboxComponent } from './common/tri-state-checkbox/tri-state-checkbox.component';

@NgModule({
  imports: [TriStateCheckboxComponent],
  exports: [
    // SharedModule,
    // DataTableModule,
    DynamicDialog,
    AutoCompleteModule,
    CalendarModule,
    ButtonModule,
    SplitButtonModule,
    InputNumberModule,
    ConfirmDialogModule,
    DialogModule,
    SidebarModule,
    TooltipModule,
    AccordionModule,
    FieldsetModule,
    // MessagesModule,
    // MessageModule,
    TreeTableModule,
    SelectButtonModule,
    InputTextModule,
    // ChipsModule,
    DropdownModule,
    Textarea,
    // InputMaskModule,
    // PasswordModule,
    // ToggleButtonModule,
    CheckboxModule,
    TriStateCheckboxComponent,
    // RadioButtonModule,
    PaginatorModule,
    ToolbarModule,
    PanelModule,
    // MenuModule,
    ContextMenuModule,
    // PanelMenuModule,
    // TabMenuModule,
    // MegaMenuModule,
    MenuModule,
    // BreadcrumbModule,
    // TieredMenuModule,
    // StepsModule,
    // DragDropModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    // InplaceModule,
    // BlockUIModule,
    ToastModule,
    ScrollPanelModule,
    TableModule,
    TabViewModule,
    DataViewModule,
    FileUploadModule,
    ListboxModule,
    MonacoEditorModule
  ],
  providers: [ConfirmationService, MessageService]
})
export class PrimeNGModule { }

export const calendarLocale = {
  firstDayOfWeek: 1,
  dayNames: locale[3]![2],
  dayNamesShort: locale[3]![0],
  dayNamesMin: locale[3]![0],
  monthNames: locale[5]![2],
  monthNamesShort: locale[5]![1],
  today: 'Today',
  clear: 'Clear'
};

export const dateFormat = 'dd.mm.yy';
